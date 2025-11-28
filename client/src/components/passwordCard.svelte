<script>
  export let title;

  function handleEdit() {
    console.log(`Redigerer ${title}`);
  }

  function handleDelete() {
    console.log(`Sletter ${title}`);
  }
</script>

<div class="passwords-grid-container">
  <div class="passwords-grid-container-info">
    <h3 class="passwords-grid-container-title">{title}</h3>
    <button aria-label="Edit" on:click={handleEdit}
      ><svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lucide lucide-square-pen h-4 w-4"
        ><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        ></path><path
          d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"
        ></path></svg
      ></button
    >
    <button aria-label="Delete" on:click={handleDelete}
      ><svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lucide lucide-trash2 h-4 w-4"
        ><path d="M3 6h18"></path><path
          d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
        ></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line
          x1="10"
          x2="10"
          y1="11"
          y2="17"
        ></line><line x1="14" x2="14" y1="11" y2="17"></line></svg
      ></button
    >
  </div>
  <div class="passwords-grid-container-info-wrapper">
    <div class="passwords-grid-container-info-item">
      <div class="passwords-grid-container-info-item-wrapper">
        <p></p>
        <p></p>
      </div>
      <button aria-label="Copy"
        ><svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-copy h-4 w-4"
          ><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path
            d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
          ></path></svg
        ></button
      >
    </div>
    <div class="passwords-grid-container-info-item">
      <div class="passwords-grid-container-info-item-wrapper">
        <p></p>
        <p></p>
      </div>
      <button aria-label="Copy"
        ><svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-copy h-4 w-4"
          ><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path
            d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
          ></path></svg
        ></button
      >
      <button aria-label="Watch"
        ><svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-eye h-4 w-4"
          ><path
            d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
          ></path><circle cx="12" cy="12" r="3"></circle></svg
        ></button
      >
    </div>
  </div>
</div>

<style>
  button {
    background-color: transparent;
    border: none;
    cursor: pointer;
  }

  svg {
    color: white;
    height: 15px;
  }

  .passwords-grid-container {
    background-color: #082114;
    border: 1px solid #6fbd96;
    width: 400px;
    height: 250px;
    border-radius: 10px;
    padding: 10px;
  }

  .passwords-grid-container-info {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .passwords-grid-container-title {
    width: 100%;
    color: white;
    font-family: "Montserrat", sans-serif;
    font-size: 700;
  }

  .passwords-grid-container-info-item {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    background-color: #17362680;
    border-radius: 5px;
    padding: 10px;
  }

  .passwords-grid-container-info-wrapper {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .passwords-grid-container-info-item-wrapper {
    width: 100%;
  }
  .passwords-grid-container-info-item-wrapper p {
    color: white;
    margin: 0;
  }
</style>
