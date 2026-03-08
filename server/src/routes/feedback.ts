import { Router, Request, Response } from "express";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackType = "bug" | "suggestion" | "autre";

interface FeedbackBody {
  type: FeedbackType;
  title: string;
  description: string;
}

interface GitHubIssueResponse {
  html_url: string;
  number: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "🐛 Bug",
  suggestion: "💡 Suggestion",
  autre: "❓ Autre",
};

const GITHUB_LABEL_MAP: Record<FeedbackType, string> = {
  bug: "bug",
  suggestion: "enhancement",
  autre: "feedback",
};

function buildIssueBody(type: FeedbackType, description: string): string {
  return [
    `## Description`,
    ``,
    description.trim(),
    ``,
    `---`,
    `*Soumis via l'application Nos limites*`,
    `*Type : ${TYPE_LABELS[type]}*`,
  ].join("\n");
}

async function createGitHubIssue(
  title: string,
  body: string,
  labels: string[],
): Promise<GitHubIssueResponse> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is not set.");
  }

  const response = await fetch(
    "https://api.github.com/repos/decarufe/nos-limites/issues",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body, labels }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `GitHub API responded with ${response.status}: ${errorText}`,
    );
  }

  return response.json() as Promise<GitHubIssueResponse>;
}

// ─── POST /api/feedback ───────────────────────────────────────────────────────

/**
 * Create a GitHub issue from user feedback submitted through the app.
 *
 * Body: { type: "bug" | "suggestion" | "autre", title: string, description: string }
 * Response: { issueUrl: string, issueNumber: number }
 *
 * Requires the GITHUB_TOKEN environment variable to have `issues: write`
 * permission on the `decarufe/nos-limites` repository.
 */
router.post("/feedback", async (req: Request, res: Response) => {
  const { type, title, description } = req.body as Partial<FeedbackBody>;

  // Validate input
  if (!type || !["bug", "suggestion", "autre"].includes(type)) {
    res.status(400).json({
      success: false,
      message: "Le champ 'type' est requis (bug, suggestion ou autre).",
    });
    return;
  }
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: "Le champ 'title' est requis.",
    });
    return;
  }
  if (
    !description ||
    typeof description !== "string" ||
    description.trim().length === 0
  ) {
    res.status(400).json({
      success: false,
      message: "Le champ 'description' est requis.",
    });
    return;
  }

  // Truncate to reasonable limits
  const safeTitle = title.trim().slice(0, 256);
  const safeDescription = description.trim().slice(0, 65536);

  try {
    const issueBody = buildIssueBody(type, safeDescription);
    const labels = ["feedback", GITHUB_LABEL_MAP[type]].filter(
      (v, i, a) => a.indexOf(v) === i, // deduplicate (suggestion → "enhancement", others keep both)
    );

    const issue = await createGitHubIssue(safeTitle, issueBody, labels);

    console.log(
      `[Feedback] GitHub issue #${issue.number} created: ${issue.html_url}`,
    );

    res.status(201).json({
      success: true,
      issueUrl: issue.html_url,
      issueNumber: issue.number,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[Feedback] Failed to create GitHub issue:", message);

    if (message.includes("GITHUB_TOKEN")) {
      res.status(503).json({
        success: false,
        message: "Le service de feedback n'est pas configuré.",
      });
      return;
    }

    res.status(502).json({
      success: false,
      message: "Impossible de créer le ticket. Veuillez réessayer plus tard.",
    });
  }
});

export default router;
