const fs = require("fs")
const http = require("http");
const https = require('https');

var host = "localhost";
var port = 8000;

var lastAdress = "0.0.0.0";

const defaultContent =
"<div>\n" +
"   <span class=\"one-line-poem-name\" title=\"FULLNAME | DATE\">NAME</span>\n" +
"   <span>LINE</span>\n" +
"   <br>\n" +
"</div>\n";

function sanitise(string) {
    return string.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
}

//Check for empty / whitespace strings
function isBlank(string) {
    return (!string || /^\s*$/.test(string));
}

const requestListener = function (req, res) { //request (incoming) response (outgoing)
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.writeHead(200);

    if (req.method == "GET") {
        fs.readFile("poem.html", 'utf8' , (err, newContent) => {
            if (err) {
                console.error(err)
                return
            }

            res.end(newContent);
        });
    }
    if (req.method == "POST") {
        let body = '';
        req.on('data', chunk => {
            //Convert Buffer to string
            body += chunk.toString();
        });
        req.on('end', () => {
            fs.readFile("poem.html", (err, data) => {
                if (err) {
                    console.error(err);
                    return;
                }

                //Generated ANSI escape codes from @https://ansi.gabebanks.net/
                try {
                    var commentObject = JSON.parse(body);

                    if (req.socket.remoteAddress == lastAdress) {
                        console.log("\033[90;49;3mUser ha posted a line more than once at a time, rejecting.\033[0m");
                        return;
                    }
                    if (isBlank(commentObject.name)) { //Check for blank name
                        commentObject.name = "????????";
                    }
                    if (isBlank(commentObject.line) || commentObject.line.trim().length <= 2) { //Check for blank message
                        console.log("\033[90;49;3mEmpty or spam poem line detected, rejecting.\033[0m");
                        return;
                    }

                    const originalName = commentObject.name;
                    commentObject.name = commentObject.name.substring(0, 8);
                    commentObject.line = commentObject.line.substring(0, 154);

                    commentObject.name = `[${commentObject.name}]`;
                    commentObject.name = sanitise(commentObject.line);
                    commentObject.line = sanitise(commentObject.line);

                    let date = new Date();
                    var newPoemLine = defaultContent
                        .replace("FULLNAME", originalName)
                        .replace("DATE", `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`)
                        .replace("NAME", commentObject.name)
                        .replace("LINE", commentObject.line)
                    ;

                    lastAdress = req.socket.remoteAddress; 

                    fs.writeFile("poem.html", newPoemLine, err => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        console.log("\033[90;49;3mSucessfully added line to poem | " + req.socket.remoteAddress + " | " + commentObject.name + " | " + commentObject.line + "\033[0m");
                    });
                    res.end(); //End the request, so that the client can confirm that it was sucessful.
                }
                catch (exception) {
                    console.error(`Critical failure when posting message:\n${exception}, from ${req.socket.remoteAddress}`);
                }
            });
        });
    }
};

function startServer() {
    server = http.createServer(requestListener);

    server.listen(port, host, () => {
        console.log(`Server is running on http://${host}:${port}`);
    
        if (!fs.existsSync("poem.html"))
        {
            fs.writeFile("poem.html", "", err => {
                if (err) {
                    console.error(err);
                    return;
                }
            });
        }
    });
}

startServer();