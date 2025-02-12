import ollama from 'ollama'

import Database from 'better-sqlite3';

const db = new Database('embed.db');


async function EmbedUserQuery(query) {
    const res = await ollama.embed({
        model: "mxbai-embed-large",
        truncate: true,
        input: query,
        // truncate: true
    })

    return res.embeddings.flat()
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


async function CheckSimalirity(query, sess) {
    const rows = db.prepare(`
          SELECT * FROM embeddings WHERE sessid = ?
        `).all(sess)

    // const rows = stmt.run(sess)
    // console.log(rows)
    console.log(rows.length, "lengt")
    let matches = ``
    if (rows.length > 0) {
        const embedding = await EmbedUserQuery(query)
        // console.log(embedding)
        for (const row of rows) {
            const e = JSON.parse(row.embeddings)
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
    const query = await CheckSimalirity(userQuery, sess)
    // console.log("formatted query: ", query)
    // feed it to the model
    const message = { role: 'user', content: query }
    const response = await ollama.chat({ model: 'llama3.2', messages: [message], stream: true })
    for await (const part of response) {
        process.stdout.write(part.message.content)
    }
}


const testDb = () => {
    const rows = db.prepare(`
        SELECT * FROM embeddings LIMIT 1
      `).all();
    console.log(rows.length, rows)

}

// testDb()
// Chat("hello model", "sess1")  // 0.39
// Chat("file system for large distributed data-intensive applications", "sess1") // 0.8186786048573823


// //
// Chat("file system for large distributed data-intensive applications", "sess2")  //  0.38
Chat("advertising, marketing, paid subscriptions", "sess2")  //  0.63
