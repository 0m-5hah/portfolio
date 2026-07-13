(function () {
  'use strict';

  var printBtn = document.getElementById('resume-print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', function () {
      window.print();
    });
  }
})();
