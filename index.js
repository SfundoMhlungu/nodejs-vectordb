import ollama from 'ollama'

import Database from 'better-sqlite3';

const db = new Database('embedblob.db');

// db.loadExtension("C:/Users/baned/Workspace/personal/ccpp/sqliteextension/learn/sim/simd_vector.dll")
// db.function("cosine_similarity", cosineSimilarity)
async function EmbedUserQuery(query) {
    const res = await ollama.embed({
        model: "mxbai-embed-large",
        truncate: true,
        input: query,
        // truncate: true
    })
   const f = new Float32Array(res.embeddings.flat())
    return  f
}




function computeL2Norm(vector) {
    let sumSq = 0;
    for (let i = 0; i < vector.length; i++) {
        const val = vector[i];
        sumSq += val * val;
    }
    return Math.sqrt(sumSq);
}


function cosineSimilarity(v1, v2) {
    console.log("using js native")
    v1 = new Float32Array(v1.buffer)
    v2 = new Float32Array(v2.buffer)
    if (v1.length !== v2.length) {
        throw new Error("Vectors must be of the same length.");
    }
    let dot = 0, norm1Sq = 0, norm2Sq = 0;
    for (let i = 0; i < v1.length; i++) {
        const a = v1[i];
        const b = v2[i];
        dot += a * b;
        norm1Sq += a * a;
        norm2Sq += b * b;
    }
    return dot / (Math.sqrt(norm1Sq) * Math.sqrt(norm2Sq));
}


async function CheckSimalirityNative(query, sess, sim){
    const embedding = await EmbedUserQuery(query)
    const f = new Float32Array(embedding)
    const res2 = db.prepare(`
        SELECT *,
               cosine_similarity(embeddings, ?) AS similarity
        FROM embeddings
        WHERE sessid = ? AND similarity > ?
    `).all(embedding, sess, sim);

      console.log(res2.length, "length")
       let matches = ``
       if(res2.length > 0){
          for(const res of res2)
              matches += res.content
       }


       return matches !== `` ? `
       context: ${matches}\n
       user query: ${query}
      ` : query
}

async function CheckSimalirity(query, sess) {
    const rows = db.prepare(`
          SELECT * FROM embeddings WHERE sessid = ?
        `).all(sess)

    // const rows = stmt.run(sess)
    // console.log(rows)
    console.log(rows.length, "length")
    let matches = ``
    if (rows.length > 0) {
        const embedding = await EmbedUserQuery(query)
        // console.log(embedding)
        for (const row of rows) {
            const e = new Float32Array(row.embeddings.buffer)
            const sim = cosineSimilarity(embedding, e)
            console.log(`doc: ${row.name}, similarity: ${sim}, user query: ${query}`)
            if (sim > 0.6) {
                matches += row.content + "\n"
            }
        }
    }

    return matches !== `` ? `
     context: ${matches}\n
     user query: ${query}
    ` : query


}


async function Chat(userQuery, sess) {
    // const query = await CheckSimalirity(userQuery, sess)
    const query = await CheckSimalirityNative(userQuery, sess, 0.8)
    console.log("formatted query: ", query)
    // feed it to the model
    const message = { role: 'user', content: query }
    const response = await ollama.chat({ model: 'llama3.2', messages: [message], stream: true })
    for await (const part of response) {
        process.stdout.write(part.message.content)
    }
}



const f = await EmbedUserQuery("file system for large distributed data-intensive applications")
const testDb = () => {
    const rows = db.prepare(`
        SELECT *, cosine_similarity(embeddings, ?) AS similarity
         FROM embeddings WHERE sessid = ?
      `).all(f, "sess1");
    

    const f1 = new Float32Array(rows[0].embeddings.buffer)
    const f2 = new Float32Array(rows[1].embeddings.buffer)
//    const f1 = new Float32Array([0.1, 0.2, 0.3])
//    const f2 = new Float32Array([0.1, 0.2, 0.3])
    
    console.log(rows)
    // console.log(cosineSimilarity(f1, f2))
 
    // const res = db.prepare(`
    //      select cosine_similarity(?, ?)
    //     `).all(f1, f2)

        // const res2 = db.prepare(`
        //     SELECT *,
        //            cosine_similarity(embeddings, ?) AS similarity
        //     FROM embeddings
        //     WHERE sessid = ? AND similarity > ?
        // `).all(f1, "sess1", 0.9);
        // console.log(res, "res")
        // console.log(res2, "res2")
        // console.log(rows.length, new Float32Array(rows[0].embeddings.buffer).slice(-5))
}

// testDb()
// Chat("hello model", "sess1")  // 0.39
// Chat("file system for large distributed data-intensive applications", "sess1") // 0.8186786048573823


// //
// Chat("file system for large distributed data-intensive applications", "sess2")  //  0.38
// Chat("advertising, marketing, paid subscriptions", "sess2")  //  0.63

testDb()