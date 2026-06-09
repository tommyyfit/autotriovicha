const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, 'blog');
const outputFile = path.join(__dirname, 'clanky.json');

try {
  if (fs.existsSync(blogDir)) {
    const files = fs.readdirSync(blogDir);
    const clanky = files
      .filter(file => file.endsWith('.md'))
      .map(file => {
        const obsah = fs.readFileSync(path.join(blogDir, file), 'utf8');
        return {
          slug: file.replace('.md', ''),
          obsah: obsah
        };
      });

    fs.writeFileSync(outputFile, JSON.stringify(clanky, null, 2));
    console.log(`Úspěšně uloženo ${clanky.length} článků do clanky.json`);
  } else {
    fs.writeFileSync(outputFile, JSON.stringify([]));
    console.log('Složka blog neexistuje, vytvořen prázdný clanky.json');
  }
} catch (error) {
  console.error('Chyba při přípravě článků:', error);
  process.exit(1);
}