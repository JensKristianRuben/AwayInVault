import session from "express-session";
import supabase from "../util/supabaseClient.js";

class SupabaseStore extends session.Store {
  async get(sid, callback) {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("sid", sid)
        .single();

      if (error || !data) return callback(null, null);

      callback(null, data.sess);
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, sess, callback) {
    try {
      const expire = new Date(Date.now() + 1000 * 60 * 60 * 24);
      const { error } = await supabase.from("sessions").upsert({
        sid,
        sess,
        expire,
      });

      callback(error || null);
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      const { error } = await supabase.from("sessions").delete().eq("sid", sid);
      callback(error || null);
    } catch (err) {
      callback(err);
    }
  }
}

export default SupabaseStore;
