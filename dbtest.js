import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  connectionString: "postgresql://postgres:2E0aqsfwMVyyYyWr@db.hekbxulfxbznntuahtqx.supabase.co:5432/postgres"
});

async function test() {
  try {
    await client.connect();
    const res = await client.query("SELECT NOW()");
    console.log("Connection works:", res.rows);
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await client.end();
  }
}

test();
