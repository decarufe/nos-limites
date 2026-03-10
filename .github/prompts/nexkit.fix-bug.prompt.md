---
description: "Systematically diagnose and fix development bugs across any language or platform with automated test validation"
agent: "agent"
tools: ["workspace-edit", "file-edit", "run-in-terminal"]
argument-hint: "Describe the bug you need to fix"
---

# Bug Fixing Workflow

A systematic, cross-platform approach to diagnose, reproduce, fix, and validate bug fixes with comprehensive test coverage. Supports any language (C#, TypeScript, Python, JavaScript, PowerShell, YAML, etc.) and operating system (Windows, Linux, macOS).

## Mission

You WILL analyze the reported bug, create reproducible test cases, propose a fix strategy, implement the solution, and validate the fix through automated testing. You WILL iteratively refine the solution until all tests pass and the bug is resolved.

## Scope and Preconditions

- Apply this workflow when a user reports a bug with specific symptoms, error messages, or unexpected behavior
- You MUST have access to the relevant source code and testing infrastructure
- If the bug description is vague, you WILL ask clarifying questions before proceeding
- You WILL follow the project''s existing code conventions, testing patterns, and git commit practices

## Inputs

| Input                     | Source             | Description                                                                            |
| ------------------------- | ------------------ | -------------------------------------------------------------------------------------- |
| Bug description           | User argument      | Detailed description of the bug including symptoms, error messages, steps to reproduce |
| Expected behavior         | User clarification | What should happen instead of the current behavior                                     |
| Affected files/components | Analysis           | Files or modules where the bug manifests or originates                                 |
| Existing test coverage    | Codebase analysis  | Current automated tests related to the affected component                              |

## Workflow

### Step 1: Analyze the Problem

You WILL thoroughly analyze the bug description:

1. **Read and understand** the bug report including all error messages, stack traces, and reproduction steps
2. **Identify affected components** by searching the codebase for relevant files, functions, or modules
3. **Review existing code** in the affected areas to understand current implementation
4. **Check for related issues** such as similar bugs, recent changes, or known limitations
5. **Document your understanding** including:
   - Root cause hypothesis
   - Affected components and dependencies
   - Potential side effects of changes
   - Risk assessment (low/medium/high impact)

### Step 2: Detect Testing Infrastructure and Environment

You WILL identify the project's testing setup and commands before proceeding:

1. **Detect the operating system**:
   - Check environment: Windows (PowerShell, cmd), Linux/macOS (bash, sh)
   - Note path separators and command syntax differences

2. **Identify the project type and language**:
   - Check for configuration files: `package.json` (Node.js), `*.csproj` (C#), `requirements.txt`/`pyproject.toml` (Python), `Gemfile` (Ruby), `go.mod` (Go), `Cargo.toml` (Rust), etc.
   - Examine file extensions in the codebase: `.ts`, `.js`, `.py`, `.cs`, `.ps1`, `.yaml`, etc.
   - Determine if frontend, backend, infrastructure, or multi-language monorepo

3. **Find the test framework and runner**:
   - **Node.js/TypeScript**: Jest, Mocha, Vitest, Jasmine, Karma, Playwright, Cypress
   - **C#/.NET**: xUnit, NUnit, MSTest
   - **Python**: pytest, unittest, nose
   - **Ruby**: RSpec, Minitest
   - **Go**: go test
   - **Rust**: cargo test
   - **Java**: JUnit, TestNG
   - **PowerShell**: Pester
   - Check for test configuration files: `jest.config.js`, `mocha.opts`, `pytest.ini`, `phpunit.xml`, etc.

4. **Determine test commands**:
   - Look for test scripts in configuration files (e.g., `"scripts": {"test": "..."}` in package.json)
   - Check CI/CD pipeline files: `.github/workflows/*.yml`, `azure-pipelines.yml`, `.gitlab-ci.yml`
   - Review project documentation: `README.md`, `CONTRIBUTING.md`, `docs/testing.md`
   - Common patterns:
     - **Node.js**: `npm test`, `npm run test`, `yarn test`, `pnpm test`
     - **C#/.NET**: `dotnet test`, `dotnet test --filter "TestName"`
     - **Python**: `pytest`, `python -m pytest`, `pytest -k "test_name"`
     - **Ruby**: `rspec`, `rake test`
     - **Go**: `go test ./...`, `go test -run TestName`
     - **Rust**: `cargo test`, `cargo test test_name`
     - **PowerShell**: `Invoke-Pester`, `Invoke-Pester -Path ./tests`

5. **Check for existing test command documentation**:
   - Look for `.github/AGENT.md` or `.github/copilot-instructions.md`
   - Search for sections documenting test commands for Copilot

6. **Store test commands for future use**:
   - If `.github/AGENT.md` or `.github/copilot-instructions.md` exists, read it
   - If test commands are not documented, create or update the file:

   ```markdown
   ## Testing Commands

   **Project Type:** [Language/Framework]
   **Test Framework:** [Framework Name]
   **Operating System:** [Windows/Linux/macOS]

   **Run All Tests:**
   ```

   [command to run all tests]

   ```

   **Run Specific Test:**
   ```

   [command to run specific test by name/pattern]

   ```

   **Run Tests with Coverage:**
   ```

   [command to run tests with coverage report]

   ```

   **Additional Notes:**
   - [Any project-specific testing requirements]
   - [Environment setup needed before tests]
   ```

7. **Document your findings**:

   ```
   ## Testing Infrastructure Detected

   **Operating System:** [Windows/Linux/macOS]
   **Project Type:** [Language/Framework]
   **Test Framework:** [Framework Name]
   **Test Location:** [test directory path]

   **Commands:**
   - Run all tests: `[command]`
   - Run specific test: `[command with pattern]`
   - Run with filter: `[command with filter syntax]`

   **Stored in:** [path to AGENT.md or copilot-instructions.md]
   ```

### Step 3: Validate Understanding with User

You MUST pause and confirm your analysis with the user:

1. **Present your findings**:

   ```
   ## Bug Analysis Summary

   **Affected Components:**
   - [List files/modules/functions]

   **Root Cause Hypothesis:**
   - [Your understanding of why the bug occurs]

   **Expected Behavior:**
   - [What should happen instead]

   **Impact Assessment:**
   - [Scope and risk level]

   **Testing Environment:**
   - OS: [Windows/Linux/macOS]
   - Framework: [Test framework name]
   - Commands: [Test commands to be used]
   ```

2. **Ask for confirmation**: "Does this match your understanding of the issue? Any corrections or additional context?"

3. **Check for existing automated tests**:
   - If tests exist: Note which tests are related and whether they currently pass
   - If no tests exist: "I don't see automated tests for this component. Should I create test coverage as part of this fix?"

4. **Confirm test commands**: "I'll use `[detected command]` to run tests. Is this correct for your setup?"

You WILL NOT proceed to Step 4 until the user confirms your understanding is correct.

### Step 4: Create Failing Automated Test

You WILL create or update automated tests that reproduce the bug:

1. **Determine test type** (unit, integration, or end-to-end) based on the bug scope

2. **Identify test file location** following the project's testing conventions:
   - **Node.js/TypeScript**: `test/`, `tests/`, `__tests__/`, `*.test.ts`, `*.spec.ts`
   - **C#/.NET**: `*.Tests/` folders, `*Tests.cs` files
   - **Python**: `tests/`, `test_*.py` files
   - **Go**: `*_test.go` files in same directory as source
   - **Ruby**: `spec/` directory
   - **Rust**: `tests/` directory or inline with `#[cfg(test)]`
   - **PowerShell**: `*.Tests.ps1` files

3. **Create the failing test**:
   - Use descriptive test names that explain the bug
   - Include setup/teardown as needed
   - Assert the expected correct behavior (the test WILL fail initially)
   - Add comments explaining what the test validates

   **Examples by framework:**

   **Node.js (Jest/Mocha):**

   ```typescript
   test("Should handle null input without throwing error", () => {
     expect(() => myFunction(null)).not.toThrow();
   });
   ```

   **C# (xUnit):**

   ```csharp
   [Fact]
   public void ShouldHandleNullInputWithoutThrowingError()
   {
       var exception = Record.Exception(() => MyFunction(null));
       Assert.Null(exception);
   }
   ```

   **Python (pytest):**

   ```python
   def test_should_handle_null_input_without_error():
       assert my_function(None) is not None
   ```

   **PowerShell (Pester):**

   ```powershell
   Describe "MyFunction" {
       It "Should handle null input without throwing error" {
           { MyFunction -InputObject $null } | Should -Not -Throw
       }
   }
   ```

4. **Run the test** to confirm it fails for the right reason using the detected command from Step 2:
   - **Node.js**: `npm test -- --grep "test name pattern"` or `npm test -- -t "test name"`
   - **C#/.NET**: `dotnet test --filter "FullyQualifiedName~TestMethodName"`
   - **Python**: `pytest -k "test_name"` or `python -m pytest tests/test_file.py::test_name`
   - **Go**: `go test -run TestName`
   - **Rust**: `cargo test test_name`
   - **PowerShell**: `Invoke-Pester -TestName "test name"`

5. **Document the failing test**:

   ```
   ## Failing Test Created

   **Test File:** [path/to/test.file]
   **Test Name:** "Should [expected behavior]"
   **Status:** ❌ FAILING (as expected)
   **Error:** [Error message confirming the bug]
   **Run Command:** `[exact command used]`
   ```

If you cannot create an automated test (e.g., UI-only bug, external dependency), explain why and propose manual verification steps instead.

### Step 5: Propose Fix Strategy

You WILL create a detailed plan and get user approval:

1. **Describe the fix approach**:

   ```
   ## Proposed Fix Strategy

   **Changes Required:**
   1. [File/module]: [Specific change description]
   2. [File/module]: [Specific change description]

   **Rationale:**
   - [Why this approach solves the root cause]

   **Alternative Approaches Considered:**
   - [Other options and why they were not chosen]

   **Potential Side Effects:**
   - [Any risks or related functionality that might be affected]

   **Additional Tests Needed:**
   - [New test cases to add for edge cases or regression prevention]
   ```

2. **Ask for approval**: "Does this approach look correct? Any concerns or alternative approaches to consider?"

You WILL NOT proceed to Step 6 until the user approves the fix strategy.

### Step 6: Implement the Fix

You WILL implement the approved fix:

1. **Make code changes** following the approved strategy
2. **Follow code conventions** matching the project's style (indentation, naming, patterns)
3. **Add inline comments** explaining non-obvious changes or complex logic
4. **Update or add tests** for edge cases discovered during implementation
5. **Verify syntax** and ensure no compilation errors are introduced:
   - **TypeScript/JavaScript**: Check for linting errors with `npm run lint` or `eslint`
   - **C#**: Build with `dotnet build` to check for compilation errors
   - **Python**: Use `pylint`, `flake8`, or `mypy` for static analysis
   - **Go**: Run `go build` or `go vet`
   - **Rust**: Run `cargo check` or `cargo build`

### Step 7: Run Tests and Validate

You WILL execute tests and iterate if needed:

1. **Run the specific failing test** from Step 4 using the command documented in Step 2:
   - **Node.js**: `npm test -- --grep "test name pattern"` or `npm test -- -t "test name"`
   - **C#/.NET**: `dotnet test --filter "FullyQualifiedName~TestMethodName"`
   - **Python**: `pytest -k "test_name"`
   - **Go**: `go test -run TestName`
   - **Rust**: `cargo test test_name`
   - **Ruby**: `rspec spec/path/to/spec.rb:line_number`
   - **PowerShell**: `Invoke-Pester -TestName "test name"`

2. **Verify the test now passes**: ✅

3. **Run the full test suite** using the command from Step 2:
   - **Node.js**: `npm test` or `npm run test:all`
   - **C#/.NET**: `dotnet test`
   - **Python**: `pytest` or `python -m pytest`
   - **Go**: `go test ./...`
   - **Rust**: `cargo test`
   - **Ruby**: `rspec`
   - **PowerShell**: `Invoke-Pester`

4. **Check for regressions**: Ensure no previously passing tests now fail

5. **If tests still fail**:
   - Analyze the failure output carefully
   - Identify what went wrong with the fix (logic error, edge case missed, incorrect assumption)
   - Update your understanding of the problem
   - Return to **Step 5** with a revised strategy
   - Maximum 3 iteration cycles; after 3 failures, present the findings to the user: "After 3 attempts, the tests are still failing. Here's what I've tried: [summary]. I need your guidance on how to proceed."

6. **If tests pass**:
   - Document the successful validation with test output summary
   - Proceed to Step 8

### Step 8: Generate Commit Message

You WILL create a properly formatted commit message following conventional commit standards:

1. **Determine commit type and scope**:
   - Type: `fix` (for bug fixes)
   - Scope: Component or feature area (e.g., `ai-templates`, `mcp`, `panel`, `backup`)

2. **Generate commit message**:

   ```
   fix([scope]): [short description of what was fixed]

   [Optional longer description explaining:]
   - What the bug was
   - How it was fixed
   - What edge cases are now handled

   Fixes #[issue-number] (if applicable)
   ```

3. **Example**:

   ```
   fix(mcp): handle null config path on Windows

   - Added null check before path resolution
   - Created test case for missing config scenario
   - Prevents application crash when config file doesn''t exist

   Fixes #42
   ```

4. **Present commit message to user**:

   ```
   ## Suggested Commit Message

   [Generated commit message]

   Ready to commit? Type: git commit -m "[message]"
   ```

## Output Expectations

### Final Deliverables

You WILL provide:

1. ✅ **Failing test case** that reproduces the bug
2. ✅ **Fixed source code** with the bug resolved
3. ✅ **Additional test coverage** for edge cases and regression prevention
4. ✅ **Passing test suite** confirming the fix works
5. ✅ **Commit message** ready for version control

### Success Criteria

- The originally failing test now passes
- All existing tests continue to pass (no regressions)
- Code follows project conventions and style
- Fix addresses the root cause, not just symptoms
- Commit message accurately describes the change

## Quality Assurance Checklist

Before completing the workflow, verify:

- [ ] Bug analysis was confirmed by the user (Step 3)
- [ ] Testing infrastructure was detected and documented (Step 2)
- [ ] Test commands were stored in AGENT.md or copilot-instructions.md for future reference
- [ ] Operating system and framework-specific commands are correct
- [ ] Fix strategy was approved by the user (Step 5)
- [ ] At least one automated test reproduces and validates the bug fix (Step 4)
- [ ] All tests pass using the project's test runner (Step 7)
- [ ] No new linting or compilation errors introduced
- [ ] Code changes follow project conventions and style
- [ ] Commit message follows conventional commit format (Step 8)
- [ ] Edge cases and potential regressions are covered by tests

## Handling Special Cases

### When Testing Infrastructure Cannot Be Detected

If you cannot identify the test framework or commands:

1. Search the codebase for test files with common patterns: `test`, `spec`, `Test`, `_test`
2. Ask the user directly: "I couldn't detect the testing framework. How do you normally run tests in this project?"
3. Check for CI/CD configuration files which often contain test commands
4. If still unclear, document this in AGENT.md: "Testing infrastructure not yet configured. Manual testing required."

### When Automated Tests Cannot Be Created

If automated testing is not feasible:

1. Explain why: "This bug affects [visual layout/external service/hardware], which cannot be easily automated"
2. Propose manual verification steps with clear acceptance criteria
3. Document the manual test procedure in the commit message or PR description

### When the Bug Cannot Be Reproduced

If you cannot reproduce the bug in Step 4:

1. Document what you tried
2. Ask the user for additional context: environment details, OS version, data samples, configuration
3. If still cannot reproduce, recommend: "I cannot reproduce this issue. Could you provide [specific missing information]?"

### When Multiple Bugs Are Discovered

If you discover additional bugs while fixing the original:

1. Complete the current bug fix workflow
2. Document the newly discovered bugs
3. Ask the user: "I found additional issues: [list]. Should I address them in this same fix or create separate tasks?"

### Cross-Platform Considerations

When working across Windows and Linux:

1. **Path Separators**: Use appropriate path separators (`\` on Windows, `/` on Linux) or cross-platform path utilities
2. **Command Syntax**: PowerShell vs bash syntax differences:
   - **Windows PowerShell**: `$env:VAR`, `Get-ChildItem`, `;` for command chaining
   - **Linux/macOS bash**: `$VAR`, `ls`, `&&` or `||` for command chaining
3. **Line Endings**: Be aware of CRLF (Windows) vs LF (Unix) differences in test fixtures
4. **Case Sensitivity**: Linux filesystems are case-sensitive; Windows is not
5. **Permissions**: Linux may require executable permissions (`chmod +x`) for scripts

## Additional Resources

- Project testing guide: `test/README.md`, `docs/testing.md`, or `TESTING.md`
- Commit conventions: `docs/CONTRIBUTING.md` or `CONTRIBUTING.md`
- Code style guide: `.github/instructions/*.instructions.md` or `.editorconfig`
- Testing commands reference: `.github/AGENT.md` or `.github/copilot-instructions.md` (created by this workflow)
- CI/CD pipelines: `.github/workflows/*.yml`, `azure-pipelines.yml`, `.gitlab-ci.yml`
