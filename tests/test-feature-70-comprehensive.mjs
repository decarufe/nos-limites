#!/usr/bin/env node

/**
 * Feature #70 Comprehensive Mobile Responsiveness Test
 * Runs a set of validations similar to the lightweight mobile test but more strict.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runComprehensiveChecks() {
	console.log('\nRunning comprehensive mobile checks for Feature #70...');

	try {
		const { stdout } = await execAsync('type client/src/pages/RelationshipPage.module.css');

		const requiredMobileQueries = ['@media (max-width: 400px)', '@media (max-width: 375px)', '@media (max-width: 360px)'];
		const hasAny = requiredMobileQueries.some(q => stdout.includes(q));

		if (!hasAny) {
			console.log('✗ No explicit small-screen media queries found (recommended)');
		} else {
			console.log('✓ Mobile-specific media queries present');
		}

		// Check for text wrapping and word-break rules
		const wrapChecks = ['word-wrap', 'word-break', 'overflow-wrap', 'white-space'];
		const wrapFound = wrapChecks.some(w => stdout.includes(w));
		console.log(`   Text wrap rules present: ${wrapFound}`);

		// Check for touch target sizes
		const minTouch = stdout.match(/min-height:\s*(\d+)px/g) || [];
		const touchSizes = minTouch.map(m => parseInt(m.match(/(\d+)/)[0]));
		console.log(`   Found min-height sizes: ${touchSizes.join(', ')}`);

		// Check for any fixed widths
		const fixedWidths = stdout.match(/width:\s*\d+px/g) || [];
		console.log(`   Fixed width rules found: ${fixedWidths.length}`);

		// Check for flexbox usage in categories
		const categoryFlex = stdout.includes('.categoriesList') && stdout.includes('display: flex');
		console.log(`   Categories use flexbox: ${categoryFlex}`);

		const pass = hasAny && wrapFound && categoryFlex && touchSizes.length > 0;

		if (pass) {
			console.log('\n✅ Comprehensive checks passed for Feature #70');
			process.exit(0);
		} else {
			console.log('\n❌ Comprehensive checks found potential issues');
			process.exit(1);
		}

	} catch (err) {
		console.error('Error during comprehensive checks:', err.message);
		process.exit(1);
	}
}

runComprehensiveChecks();
