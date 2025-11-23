<script>
  import { onMount } from "svelte";
  import toastr from "toastr";

  let message = "Activating...";

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      message = "No activation token found.";
      return;
    }

    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        message = "Your account is now activated!";
        toastr.success(message);
      } else {
        message = data.error || "Activation failed";
        toastr.error(message);
      }
    } catch (err) {
      console.error(err);
      message = "Activation failed";
      toastr.error(message);
    }
  });
</script>

<h1>{message}</h1>
