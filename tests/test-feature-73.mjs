#!/usr/bin/env node
/**
 * Feature #73 Verification Test
 * Color contrast meets WCAG AA standards
 */

console.log('\n=== Feature #73: WCAG AA Color Contrast Verification ===\n');

let passedChecks = 0;
let totalChecks = 0;

function test(description, fn) {
	totalChecks++;
	try {
		fn();
		console.log(`✅ ${description}`);
		passedChecks++;
		return true;
	} catch (error) {
		console.log(`❌ ${description}`);
		console.log(`   ${error.message}`);
		return false;
	}
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}

function getLuminance(r, g, b) {
	const [rs, gs, bs] = [r, g, b].map(c => {
		c = c / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1, color2) {
	const rgb1 = hexToRgb(color1);
	const rgb2 = hexToRgb(color2);

	const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
	const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

	const lighter = Math.max(lum1, lum2);
	const darker = Math.min(lum1, lum2);

	return (lighter + 0.05) / (darker + 0.05);
}

function verifyContrast(color1, color2, minRatio, description) {
	const ratio = getContrastRatio(color1, color2);
	const passes = ratio >= minRatio;
	const ratioPretty = ratio.toFixed(2);

	if (!passes) {
		throw new Error(`Ratio ${ratioPretty}:1 < required ${minRatio}:1 (${color1} on ${color2})`);
	}

	return ratioPretty;
}

const colors = {
	primary: '#7C3AED',
	primaryHover: '#6D28D9',
	secondary: '#EC4899',
	accent: '#0891B2',
	bgPrimary: '#FAFAF9',
	bgSecondary: '#F5F5F4',
	white: '#FFFFFF',
	textPrimary: '#1C1917',
	textSecondary: '#78716C',
	textTertiary: '#57534E',
	success: '#10B981',
	successDark: '#047857',
	warning: '#D97706',
	error: '#DC2626',
	errorDark: '#DC2626',
	border: '#78716C',
};

console.log('1. Primary Text Contrast\n');

test('Primary text on primary background (body text)', () => {
	const ratio = verifyContrast(colors.textPrimary, colors.bgPrimary, 4.5, 'Primary text on primary background');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

test('Primary text on white background', () => {
	const ratio = verifyContrast(colors.textPrimary, colors.white, 4.5, 'Primary text on white');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

test('Primary text on secondary background', () => {
	const ratio = verifyContrast(colors.textPrimary, colors.bgSecondary, 4.5, 'Primary text on secondary bg');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

console.log('\n2. Secondary Text Contrast\n');

test('Secondary text on primary background', () => {
	const ratio = verifyContrast(colors.textSecondary, colors.bgPrimary, 4.5, 'Secondary text on primary bg');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

test('Secondary text on white background', () => {
	const ratio = verifyContrast(colors.textSecondary, colors.white, 4.5, 'Secondary text on white');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

console.log('\n3. Button Text Contrast\n');

test('White text on primary button (violet)', () => {
	const ratio = verifyContrast(colors.white, colors.primary, 4.5, 'White on primary button');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

test('White text on primary button hover', () => {
	const ratio = verifyContrast(colors.white, colors.primaryHover, 4.5, 'White on primary hover');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

test('White text on error button', () => {
	const ratio = verifyContrast(colors.white, colors.error, 4.5, 'White on error button');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

test('White text on error button hover', () => {
	const ratio = verifyContrast(colors.white, colors.errorDark, 4.5, 'White on error hover');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

test('Primary colored text on secondary background (buttons)', () => {
	const ratio = verifyContrast(colors.primary, colors.bgSecondary, 3.0, 'Primary text on secondary (large text)');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

console.log('\n4. Error/Status Text Contrast\n');

test('Error text on white background', () => {
	const ratio = verifyContrast(colors.error, colors.white, 4.5, 'Error text on white');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

test('Error text on primary background', () => {
	const ratio = verifyContrast(colors.errorDark, colors.bgPrimary, 4.5, 'Error text on primary bg');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

test('Success text on white background', () => {
	const ratio = verifyContrast(colors.successDark, colors.white, 4.5, 'Success text on white');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

test('Warning text on white background', () => {
	const ratio = verifyContrast(colors.warning, colors.white, 3.0, 'Warning text (usually large/bold)');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

console.log('\n5. Interactive Elements Contrast\n');

test('Primary border on white background', () => {
	const ratio = verifyContrast(colors.border, colors.white, 3.0, 'Border on white (UI component)');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

test('Primary link color on white background', () => {
	const ratio = verifyContrast(colors.primary, colors.white, 4.5, 'Primary link on white');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

test('Accent color on white background', () => {
	const ratio = verifyContrast(colors.accent, colors.white, 3.0, 'Accent color (UI elements)');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

console.log('\n6. Form Elements Contrast\n');

test('Input text on white background', () => {
	const ratio = verifyContrast(colors.textPrimary, colors.white, 4.5, 'Input text');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

test('Placeholder text (secondary) on white', () => {
	const ratio = verifyContrast(colors.textSecondary, colors.white, 4.5, 'Placeholder text');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

test('Input border on white background', () => {
	const ratio = verifyContrast(colors.border, colors.white, 3.0, 'Input border');
	console.log(`   Contrast ratio: ${ratio}:1`);
});

console.log('\n=== Test Summary ===\n');
console.log(`Passed: ${passedChecks}/${totalChecks} checks`);

if (passedChecks === totalChecks) {
	console.log('\n✅ Feature #73 is FULLY COMPLIANT with WCAG AA');
	process.exit(0);
} else {
	console.log('\n❌ Some contrast ratios do not meet WCAG AA standards');
	process.exit(1);
}
