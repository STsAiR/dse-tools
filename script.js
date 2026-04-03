document.getElementById('sqlFileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const errorMsg = document.getElementById('errorMsg');
    const container = document.getElementById('diagramContainer');
    
    errorMsg.textContent = '';
    container.innerHTML = '';

    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const sqlText = e.target.result;
        try {
            const mermaidSyntax = parseSQL(sqlText);
            
            if (mermaidSyntax.trim() === "erDiagram") {
                errorMsg.textContent = "No valid CREATE TABLE statements found in this file.";
                return;
            }
            
            // Inject the generated syntax into the DOM
            container.innerHTML = `<pre class="mermaid" id="mermaidGraph">${mermaidSyntax}</pre>`;
            
            // Tell Mermaid to render the injected syntax
            await window.mermaid.run({
                nodes: [document.getElementById('mermaidGraph')]
            });
            
        } catch (err) {
            errorMsg.textContent = "Error rendering diagram: " + err.message;
        }
    };
    reader.readAsText(file);
});

function parseSQL(sql) {
    let mermaidStr = "erDiagram\n";
    
    // 1. Clean the SQL: Remove comments and backticks (`)
    let cleanSql = sql.replace(/--.*$/gm, '') 
                      .replace(/\/\*[\s\S]*?\*\//g, '') 
                      .replace(/`/g, ''); 

    // 2. Regex to find CREATE TABLE blocks
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]*?)\)(?:\s*ENGINE.*?)?;/gi;
    
    let match;
    while ((match = tableRegex.exec(cleanSql)) !== null) {
        const tableName = match[1];
        const columnsBlock = match[2];
        
        mermaidStr += `    ${tableName} {\n`;
        
        // Split inner block by commas to get individual columns
        const columns = columnsBlock.split(/,(?![^\(]*\))/); 
        
        for (let col of columns) {
            col = col.trim();
            
            // Skip indexes and constraints for the visual diagram
            if (col.toUpperCase().startsWith('PRIMARY KEY') || 
                col.toUpperCase().startsWith('KEY') || 
                col.toUpperCase().startsWith('CONSTRAINT') ||
                col.toUpperCase().startsWith('UNIQUE') ||
                col.toUpperCase().startsWith('FOREIGN KEY')) {
                continue;
            }
            
            if (col.length === 0) continue;

            // Extract Column Name and Type
            const parts = col.split(/\s+/);
            if (parts.length >= 2) {
                const colName = parts[0];
                // Strip size numbers like VARCHAR(255) down to VARCHAR for cleaner diagrams
                const colType = parts[1].replace(/\(.*?\)/g, ''); 
                mermaidStr += `        ${colType} ${colName}\n`;
            }
        }
        mermaidStr += `    }\n`;
    }
    
    return mermaidStr;
}
