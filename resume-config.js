/**
 * Single source of truth for education wording on the resume.
 *
 * educationStatus: 'graduate' | 'expected'
 *   graduate → "Cybersecurity Graduate" / opening "Cybersecurity graduate"
 *   expected → student wording + "Expected graduation 2026" on education dates
 *
 * Change only educationStatus below; the DOM updates on load (and for PDF generation).
 */
(function () {
  'use strict';

  var CONFIG = {
    educationStatus: 'graduate',
    educationYears: '2023 – 2026',
    expectedGraduationLabel: 'Expected graduation 2026'
  };

  window.RESUME_CONFIG = CONFIG;

  function applyEducationStatus() {
    var isGraduate = CONFIG.educationStatus === 'graduate';

    document.querySelectorAll('[data-edu-headline]').forEach(function (el) {
      el.textContent = isGraduate
        ? 'Cybersecurity Graduate | Security Automation | Vulnerability Management'
        : 'Bachelor of Cybersecurity Student | Security Automation | Vulnerability Management';
    });

    document.querySelectorAll('[data-edu-summary]').forEach(function (el) {
      var rest = el.getAttribute('data-edu-summary-rest') || '';
      el.textContent = (isGraduate
        ? 'Cybersecurity graduate'
        : 'Bachelor of Cybersecurity student') + rest;
    });

    document.querySelectorAll('[data-edu-dates]').forEach(function (el) {
      el.textContent = isGraduate
        ? CONFIG.educationYears
        : CONFIG.educationYears + ' · ' + CONFIG.expectedGraduationLabel;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyEducationStatus);
  } else {
    applyEducationStatus();
  }
})();
