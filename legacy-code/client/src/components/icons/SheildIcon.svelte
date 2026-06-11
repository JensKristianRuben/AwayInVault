<script>
</script>

<div class="shield-wrapper" style="width: 200px; height: 200px;">
  <svg
    viewBox="0 0 24 24"
    fill="#6fbd96"
    xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"
    />
  </svg>
</div>

<style>
  .shield-wrapper {
    margin: 50px ;
    display: flex;
    justify-content: center;
    align-items: center;
    animation: pulse 3s infinite ease-in-out;
  }

  svg {
    width: 100%;
    height: 100%;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      filter: drop-shadow(0 0 0 rgba(111, 189, 150, 0));
    }
    50% {
      transform: scale(1.05);
      filter: drop-shadow(0 0 20px rgba(111, 189, 150, 0.6));
    }
    100% {
      transform: scale(1);
      filter: drop-shadow(0 0 0 rgba(111, 189, 150, 0));
    }
  }
</style>
