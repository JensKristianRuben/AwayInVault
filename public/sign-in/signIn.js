const container = document.getElementById('container');
    const goRight = document.getElementById('goRight');
    const goLeft = document.getElementById('goLeft');

    goRight.addEventListener('click', () => {
      container.classList.add('right-active');
    });

    goLeft.addEventListener('click', () => {
      container.classList.remove('right-active');
    });