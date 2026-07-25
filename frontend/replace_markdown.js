import fs from 'fs';

const filePath = './src/components/SellerGenAIPanel.tsx';
if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');

    // 1. Add remarkGfm import with regex matching single/double quotes
    const importRegex = /import\s+ReactMarkdown\s+from\s+['"]react-markdown['"];?/;
    if (importRegex.test(content)) {
        content = content.replace(importRegex, 'import ReactMarkdown from "react-markdown";\nimport remarkGfm from "remark-gfm";');
        console.log("Successfully added remarkGfm import to SellerGenAIPanel.tsx");
    } else {
        console.warn("ReactMarkdown import pattern not found in SellerGenAIPanel.tsx. Adding it at the top.");
        content = 'import remarkGfm from "remark-gfm";\n' + content;
    }

    // 2. Add remarkPlugins to all ReactMarkdown tags case-insensitively
    let replaceCount = 0;
    // Replace <ReactMarkdown but not if it already has remarkPlugins
    content = content.replace(/<ReactMarkdown(\s+)(?!remarkPlugins)/g, (match, p1) => {
        replaceCount++;
        return `<ReactMarkdown remarkPlugins={[remarkGfm]}${p1}`;
    });
    console.log(`Replaced ${replaceCount} ReactMarkdown occurrences in SellerGenAIPanel.tsx`);

    fs.writeFileSync(filePath, content, 'utf-8');
} else {
    console.error("SellerGenAIPanel.tsx not found!");
}
