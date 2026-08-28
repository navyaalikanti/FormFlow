#!/usr/bin/env node

/**
 * Scrollbar Implementation Verification Script
 * 
 * Run in browser console to verify all scrollbars are properly hidden
 * Usage: Copy and paste into browser DevTools console
 */

const SCROLLBAR_CHECK = {
  // Find all elements with hide-scrollbar class
  findHideScrollbarElements() {
    const elements = document.querySelectorAll('.hide-scrollbar');
    console.log(`✓ Found ${elements.length} elements with .hide-scrollbar class`);
    return elements;
  },

  // Find all elements with overflow properties
  findOverflowElements() {
    const elements = document.querySelectorAll('[style*="overflow"]');
    console.log(`✓ Found ${elements.length} elements with overflow properties`);
    return elements;
  },

  // Check if scrollbar-width is set to none
  checkScrollbarWidth(element) {
    const style = window.getComputedStyle(element);
    const scrollbarWidth = style.scrollbarWidth;
    return scrollbarWidth === 'none';
  },

  // Check webkit scrollbar display
  checkWebkitScrollbar(element) {
    const pseudoElement = window.getComputedStyle(element, '::-webkit-scrollbar');
    return pseudoElement.display === 'none';
  },

  // Verify all scrollable components
  verifyScrollableComponents() {
    console.log('\n=== SCROLLBAR VERIFICATION ===\n');

    const components = {
      'FormCanvas': 'main[class*="overflow-y-auto"]',
      'FieldPalette': 'aside[class*="overflow-y-auto"]',
      'PropertyPanel': 'aside[class*="overflow-y-auto"][class*="w-96"]',
      'DashboardNav': 'nav[class*="overflow-y-auto"]',
    };

    let totalFound = 0;
    let totalWithClass = 0;

    Object.entries(components).forEach(([name, selector]) => {
      const element = document.querySelector(selector);
      if (element) {
        totalFound++;
        const hasClass = element.classList.contains('hide-scrollbar');
        totalWithClass += hasClass ? 1 : 0;

        console.log(`${hasClass ? '✅' : '⚠️'} ${name}`);
        console.log(`   Selector: ${selector}`);
        console.log(`   hide-scrollbar class: ${hasClass ? 'Yes' : 'No'}`);

        const style = window.getComputedStyle(element);
        console.log(`   scrollbar-width: ${style.scrollbarWidth}`);
        console.log('');
      } else {
        console.log(`⚠️ ${name} - Not found\n`);
      }
    });

    console.log(`\nSummary: ${totalWithClass}/${totalFound} components have hide-scrollbar`);
    return totalWithClass === totalFound;
  },

  // Test scrolling functionality
  testScrolling() {
    console.log('\n=== SCROLLING TEST ===\n');
    console.log('Test scrolling on each element:');
    console.log('✓ Mouse wheel - scroll with mouse wheel');
    console.log('✓ Trackpad - two-finger swipe on trackpad');
    console.log('✓ Touch - swipe on mobile device');
    console.log('✓ Keyboard - press arrow keys (↑ ↓) or Page Up/Down\n');

    const element = document.querySelector('[class*="hide-scrollbar"]');
    if (element && element.scrollHeight > element.clientHeight) {
      console.log('✅ Scrollable element found');
      console.log(`   Element height: ${element.clientHeight}px`);
      console.log(`   Scroll height: ${element.scrollHeight}px`);
      console.log(`   Current scroll: ${element.scrollTop}px\n`);
      
      return true;
    }
    return false;
  },

  // Check CSS rules
  checkCSSRules() {
    console.log('=== CSS VERIFICATION ===\n');

    const rules = [
      {
        name: 'hide-scrollbar class',
        check: () => {
          const sheet = [...document.styleSheets]
            .find(sheet => {
              try {
                return sheet.cssRules && 
                  [...sheet.cssRules].some(rule => rule.selectorText?.includes('hide-scrollbar'));
              } catch (e) {
                return false;
              }
            });
          return !!sheet;
        }
      },
      {
        name: 'scrollbar-width CSS property',
        check: () => {
          const element = document.documentElement;
          return window.getComputedStyle(element).scrollbarWidth === 'none';
        }
      },
      {
        name: '::-webkit-scrollbar CSS rule',
        check: () => {
          const sheet = [...document.styleSheets]
            .find(sheet => {
              try {
                return sheet.cssRules && 
                  [...sheet.cssRules].some(rule => rule.selectorText?.includes('::-webkit-scrollbar'));
              } catch (e) {
                return false;
              }
            });
          return !!sheet;
        }
      }
    ];

    rules.forEach(rule => {
      console.log(`${rule.check() ? '✅' : '⚠️'} ${rule.name}`);
    });

    console.log('');
  },

  // Run all checks
  runAllChecks() {
    console.clear();
    console.log('%c🎯 FormFlow Scrollbar Implementation Verification', 'font-size: 16px; font-weight: bold; color: #f97316;');
    console.log('');

    this.checkCSSRules();
    const componentsOk = this.verifyScrollableComponents();
    const scrollingOk = this.testScrolling();

    console.log('=== FINAL STATUS ===\n');
    if (componentsOk && scrollingOk) {
      console.log('%c✅ All checks passed! Scrollbars are properly hidden.', 'color: green; font-weight: bold;');
      console.log('%cManual testing: Try scrolling with mouse wheel, trackpad, touch, or keyboard.', 'color: blue;');
    } else {
      console.log('%c⚠️ Some checks may need attention.', 'color: orange; font-weight: bold;');
    }

    console.log('\nFor detailed documentation, see: frontend/SCROLLBAR_HIDING_GUIDE.md');
  }
};

// Export for use in console or as a module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SCROLLBAR_CHECK;
} else {
  // Auto-run if in browser console
  SCROLLBAR_CHECK.runAllChecks();
}
