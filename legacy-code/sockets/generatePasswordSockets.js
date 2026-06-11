export default (io, socket) => {
    socket.on("get-external-password", async ({ length }) => {
        try {
            if (length > 32) {  
                return socket.emit("server-error", "Length exceeds maximum of 32");
            }
            const response = await fetch(`https://www.random.org/strings/?num=1&len=${length}&digits=on&upper=on&lower=on&unique=on&format=plain&rnd=new`);
            if (response.ok) {
                const password = await response.text();
                socket.emit("server-password", password.trim());
            } else {
                socket.emit("server-error", "API error");
            }
        } catch (error) {
            console.error(error);
            socket.emit("server-error", "Server error");
        }
    });
};

