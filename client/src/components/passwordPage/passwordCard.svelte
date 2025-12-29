<script>
  import EditIcon from "../icons/EditIcon.svelte";
  import DeleteIcon from "../icons/DeleteIcon.svelte";
  import CopyIcon from "../icons/CopyIcon.svelte";



  let { title, username, encrypted_password, onWatchClick, decrypted_password, onDeleteClick, id, onEdit } = $props();

  function handleEdit() {
    onEdit()    
  }

  function handleDelete() {
   onDeleteClick(id)
  }

  function handleShowPassword() {
    onWatchClick(encrypted_password);
  }

  function handleCopyUsername() {
    navigator.clipboard.writeText(username)
  }

  function handleCopyPassword() {
    if(decrypted_password) {
      navigator.clipboard.writeText(decrypted_password)
    }
    else {
      navigator.clipboard.writeText(encrypted_password)
    }
  }


  
</script>

<div class="passwords-grid-container">
  <div class="passwords-grid-container-info">
    <h3 class="passwords-grid-container-title">{title}</h3>
    <EditIcon onclick={handleEdit}/>
    <DeleteIcon onclick={handleDelete}/>
    
  </div>
  <div class="passwords-grid-container-info-wrapper">
    <div class="passwords-grid-container-info-item">
      <div class="passwords-grid-container-info-item-wrapper">
        <p>Username</p>
        <p>{username}</p>
      </div>
     <CopyIcon onclick={handleCopyUsername}/>
    </div>
    <div class="passwords-grid-container-info-item">
      <div class="passwords-grid-container-info-item-wrapper">
        <p>Password</p>
        <p>{decrypted_password ? decrypted_password : '••••••••••'}</p>
      </div>
      <button aria-label="Copy" onclick={handleCopyPassword}
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
      <button aria-label="Watch" onclick={handleShowPassword} 
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
