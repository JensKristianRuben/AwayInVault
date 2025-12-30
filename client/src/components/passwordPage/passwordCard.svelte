<script>
  import EditIcon from "../icons/EditIcon.svelte";
  import DeleteIcon from "../icons/DeleteIcon.svelte";
  import CopyIcon from "../icons/CopyIcon.svelte";
  import EyeIcon from "../icons/EyeIcon.svelte";

  let {
    title,
    username,
    encrypted_password,
    onWatchClick,
    decrypted_password,
    onDeleteClick,
    id,
    onEdit,
  } = $props();

  function handleEdit() {
    onEdit();
  }

  function handleDelete() {
    onDeleteClick(id);
  }

  function handleShowPassword() {
    onWatchClick(encrypted_password);
  }

  function handleCopyUsername() {
    navigator.clipboard.writeText(username);
  }

  function handleCopyPassword() {
    if (decrypted_password) {
      navigator.clipboard.writeText(decrypted_password);
    } else {
      navigator.clipboard.writeText(encrypted_password);
    }
  }
</script>

<div class="passwords-grid-container">
  <div class="passwords-grid-container-info">
    <h3 class="passwords-grid-container-title">{title}</h3>
    <EditIcon onclick={handleEdit} />
    <DeleteIcon onclick={handleDelete} />
  </div>
  <div class="passwords-grid-container-info-wrapper">
    <div class="passwords-grid-container-info-item">
      <div class="passwords-grid-container-info-item-wrapper">
        <p>Username</p>
        <p>{username}</p>
      </div>
      <CopyIcon onclick={handleCopyUsername} />
    </div>
    <div class="passwords-grid-container-info-item">
      <div class="passwords-grid-container-info-item-wrapper">
        <p>Password</p>
        <p>{decrypted_password ? decrypted_password : "••••••••••"}</p>
      </div>
      <CopyIcon onclick={handleCopyPassword} />
      <EyeIcon onclick={handleShowPassword} />
    </div>
  </div>
</div>

<style>
  .passwords-grid-container {
    background-color: #082114;
    border: 1px solid #6fbd96;
    box-shadow: 0 0 15px rgba(0, 255, 128, 0.2);
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
