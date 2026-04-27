window.addEventListener('load', () => {
    const targetDiv = document.getElementById('postedit');

    if (targetDiv) {
      // Access the current text content
      const originalText = targetDiv.innerHTML;

      // Use a regular expression with the 'g' flag for global replacement 
      // and 'i' if you want it to be case-insensitive
      const updatedText = originalText.replace(/\bbut\b/g, 'indeed');

      // Update the DOM
      targetDiv.innerHTML = updatedText;
      
      // Optional: Visual confirmation for the tester
      targetDiv.classList.add('highlight-change');
      console.log('Text replacement complete.');
    } else {
      console.error("Element with id 'postedit' not found.");
    }
  });
