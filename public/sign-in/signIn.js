const container = document.getElementById('container');
    const goRight = document.getElementById('goRight');
    const goLeft = document.getElementById('goLeft');

    goRight.addEventListener('click', () => {
      container.classList.add('right-active');
      goLeft.style.display = 'block';
      goRight.style.display = 'none';
    });

    goLeft.addEventListener('click', () => {
      container.classList.remove('right-active');
      goLeft.style.display = 'none';
      goRight.style.display = 'block';
    });