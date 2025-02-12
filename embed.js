import {readFileSync, readdirSync} from "fs"
import ollama from 'ollama'
import Database from 'better-sqlite3';
import {v4 as uuidv4} from "uuid"

const db = new Database('embed.db');
db.exec(`
    CREATE TABLE IF NOT EXISTS embeddings (
      id TEXT PRIMARY KEY,
      sessid TEXT,
      name TEXT,
      content TEXT,
      embeddings TEXT
    );
    
    PRAGMA journal_mode = WAL;  -- Better write performance
  `);

// const f = readFileSync("./data/sess1/1.txt", "utf-8")
const sesss = readdirSync("./data")
let data = {}
// {
//     sess1: [ '1.txt', '2.txt', '3.txt' ],
//     sess2: [ '1.txt', '2.txt', '3.txt' ]
//   }
  
for(const s of sesss){
    const files = readdirSync(`./data/${s}`)
    data[s] = files
}

for(const [key, files] of Object.entries(data)){
   for(const f of files){
     const content = readFileSync(`./data/${key}/${f}`, "utf-8")
     Embed(content, {session: key, name: f})
   }
}


async function saveToDb(embeddings, meta, content){
//   console.log(meta, embeddings)
const transaction = db.transaction(()=> {
    const stmt = db.prepare(`
        INSERT INTO embeddings 
        VALUES (?, ?, ?, ?, ?)
      `);
      const id = uuidv4()
      stmt.run(id, meta.session, meta.name, content, embeddings);
})

transaction()
}

/**
 * 
 * @param {string} content 
 * @param {Object} meta 
 */
async function Embed(content, meta){
//   console.log(meta, content.substring(0, 20))

const res = await ollama.embed({
    model: "mxbai-embed-large",
    truncate: true,
    input: content,

})
// console.log(res.model, res.embeddings.flat(), meta)
  meta.model = res.model
  saveToDb(JSON.stringify(res.embeddings.flat()), meta, content)
}
// console.log(f)


