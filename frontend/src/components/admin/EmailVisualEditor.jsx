import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './EmailVisualEditor.css';

const blocks = [
    {
        type: 'text', label: 'Text', icon: (
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M4 7h16M12 7v13M9 20h6" /></svg>
        ), defaultContent: '<p style="font-family: \'Open Sans\', sans-serif; line-height: 1.6; font-size: 16px; color: #333; text-align: left;">Enter your text here...</p>'
    },
    {
        type: 'image', label: 'Image', icon: (
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        ), defaultContent: '<div style="margin-bottom: 20px;"><img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" style="width: 100%; border-radius: 4px;" alt="Nature" /></div>'
    },
    {
        type: 'button', label: 'Button', icon: (
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 012-2h10a2 2 0 012 2M5 12a2 2 0 002 2h10a2 2 0 002-2" /></svg>
        ), defaultContent: '<div style="text-align:center; padding:20px;"><a href="#" style="background:#DE7441; color:#ffffff; padding:15px 60px; text-decoration:none; border-radius:4px; font-weight:bold; font-family: \'Open Sans\', sans-serif; display:inline-block; font-size: 18px; text-transform: uppercase;">Shop Now</a></div>'
    },
    {
        type: 'product', label: 'Product', icon: (
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
        ), defaultContent: '<div style="background: #ffffff; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 20px; font-family: \'Open Sans\', sans-serif;"><img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80" style="width: 100%; display: block;" alt="Product Image" /><div style="padding: 20px; text-align: center;"><h3 style="margin: 0 0 10px 0; font-size: 20px; color: #1A202C;">Essential Smart Watch</h3><p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #DE7441;">$129.00</p><a href="#" style="background: #3B82F6; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; display: inline-block;">View Details</a></div></div>'
    },
];

const EmailVisualEditor = ({
    htmlContent,
    initialBlocks,
    onChange,
    onSave,
    onSend,
    onClose,
    campaignName,
    campaignSubject,
    onNameChange,
    onSubjectChange,
    saveButtonLabel = 'Save'
}) => {
    const { currentUser } = useAuth();
    const [contentBlocks, setContentBlocks] = useState([]);
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const [showAiAssistant, setShowAiAssistant] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const canvasRef = useRef(null);

    // Send Modal States
    const [recipientLists, setRecipientLists] = useState([]);
    const [showSendModal, setShowSendModal] = useState(false);
    const [selectedListIds, setSelectedListIds] = useState([]);
    const [sending, setSending] = useState(false);

    const API_URL = "http://localhost:5000/api";

    const fetchRecipientLists = async () => {
        if (!currentUser?.uid) return;
        try {
            const response = await fetch(`${API_URL}/email-marketing/lists`, {
                headers: { 'x-user-uid': currentUser.uid }
            });
            if (response.ok) {
                const data = await response.json();
                setRecipientLists(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Error fetching lists", err);
        }
    };

    // Style States for the selected block
    const [textStyle, setTextStyle] = useState({
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        fontSize: '16',
        fontFamily: 'Open Sans',
        color: '#333333',
        lineHeight: '1.6',
        padding: '0'
    });

    const [imageStyle, setImageStyle] = useState({
        src: '',
        alt: '',
        borderRadius: '4',
        textAlign: 'center'
    });

    const [buttonStyle, setButtonStyle] = useState({
        text: 'Shop Now',
        url: '#',
        backgroundColor: '#DE7441',
        color: '#ffffff',
        borderRadius: '4',
        fontSize: '18',
        textAlign: 'center'
    });

    const [productStyle, setProductStyle] = useState({
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
        title: 'Essential Smart Watch',
        price: '$129.00',
        buttonText: 'View Details',
        buttonUrl: '#',
        buttonColor: '#3B82F6',
        buttonTextColor: '#ffffff'
    });

    const [uploading, setUploading] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [showPreview, setShowPreview] = useState(false);
    const [previewDevice, setPreviewDevice] = useState('desktop');

    // Initialize with default content if empty
    useEffect(() => {
        if (contentBlocks.length === 0) {
            if (initialBlocks && initialBlocks.length > 0) {
                setContentBlocks(initialBlocks);
                setHistory([initialBlocks]);
                setHistoryIndex(0);
            } else {
                const defaultBlocks = [
                    { id: '1', type: 'text', content: '<h1 style="font-family: \'Dancing Script\', cursive; font-size: 64px; color: #8BA888; text-align: center; margin-bottom: 0px; font-weight: bold;">Spring Adventure Awaits!</h1>' },
                    { id: 'sub', type: 'text', content: '<p style="text-align: center; text-transform: uppercase; letter-spacing: 2px; font-size: 14px; margin-bottom: 20px; font-weight: 600; font-family: \'Open Sans\', sans-serif;">Explore the great outdoors</p>' },
                    { id: '2', type: 'image', content: blocks[1].defaultContent },
                    { id: '3', type: 'text', content: '<p style="font-family: \'Open Sans\', sans-serif; line-height: 1.6; font-size: 16px; color: #333; text-align: center;">Get ready for breathtaking hikes, camping under the stars, and unforgettable adventures. Let\'s make this spring one to remember!</p>' },
                    { id: '4', type: 'button', content: blocks[2].defaultContent }
                ];
                setContentBlocks(defaultBlocks);
                setHistory([defaultBlocks]);
                setHistoryIndex(0);
            }
        }
    }, [initialBlocks]);

    // Sync style state when selection changes
    useEffect(() => {
        if (selectedBlockId) {
            const block = contentBlocks.find(b => b.id === selectedBlockId);
            if (block && block.type === 'text') {
                const html = block.content;
                const styleMatch = html.match(/style="([^"]*)"/);

                let styles = {};
                if (styleMatch) {
                    const styleStr = styleMatch[1];
                    styleStr.split(';').forEach(s => {
                        const parts = s.split(':');
                        if (parts.length >= 2) {
                            const key = parts[0].trim();
                            const val = parts.slice(1).join(':').trim();
                            styles[key] = val;
                        }
                    });
                }

                setTextStyle({
                    fontWeight: styles['font-weight'] || 'normal',
                    fontStyle: styles['font-style'] || 'normal',
                    textDecoration: styles['text-decoration'] || 'none',
                    textAlign: styles['text-align'] || 'left',
                    fontSize: (styles['font-size'] || '16px').replace('px', ''),
                    fontFamily: styles['font-family']?.replace(/'/g, '').split(',')[0] || 'Open Sans',
                    color: styles['color'] || '#333333',
                    lineHeight: styles['line-height'] || '1.6',
                    padding: (styles['padding'] || '0px').replace('px', '')
                });
            } else if (block && block.type === 'image') {
                const html = block.content;
                const srcMatch = html.match(/<img[^>]*src="([^"]*)"/);
                const altMatch = html.match(/<img[^>]*alt="([^"]*)"/);
                const imgStyleMatch = html.match(/<img[^>]*style="([^"]*)"/);
                const outerStyleMatch = html.match(/<div style="([^"]*)"/);

                let imgStyles = {};
                if (imgStyleMatch) {
                    imgStyleMatch[1].split(';').forEach(s => {
                        const [k, v] = s.split(':').map(x => x?.trim());
                        if (k && v) imgStyles[k] = v;
                    });
                }

                let outerStyles = {};
                if (outerStyleMatch) {
                    outerStyleMatch[1].split(';').forEach(s => {
                        const [k, v] = s.split(':').map(x => x?.trim());
                        if (k && v) outerStyles[k] = v;
                    });
                }

                setImageStyle({
                    src: srcMatch ? srcMatch[1] : '',
                    alt: altMatch ? altMatch[1] : '',
                    borderRadius: (imgStyles['border-radius'] || '4').replace('px', ''),
                    textAlign: outerStyles['text-align'] || 'center'
                });
            } else if (block && block.type === 'button') {
                const html = block.content;
                const textMatch = html.match(/>([^<]*)<\/a>/);
                const urlMatch = html.match(/href="([^"]*)"/);
                const aStyleMatch = html.match(/<a[^>]*style="([^"]*)"/);
                const outerStyleMatch = html.match(/<div style="([^"]*)"/);

                let aStyles = {};
                if (aStyleMatch) {
                    aStyleMatch[1].split(';').forEach(s => {
                        const [k, v] = s.split(':').map(x => x?.trim());
                        if (k && v) aStyles[k] = v;
                    });
                }

                let outerStyles = {};
                if (outerStyleMatch) {
                    outerStyleMatch[1].split(';').forEach(s => {
                        const [k, v] = s.split(':').map(x => x?.trim());
                        if (k && v) outerStyles[k] = v;
                    });
                }

                setButtonStyle({
                    text: textMatch ? textMatch[1] : 'Shop Now',
                    url: urlMatch ? urlMatch[1] : '#',
                    backgroundColor: aStyles['background'] || '#DE7441',
                    color: aStyles['color'] || '#ffffff',
                    borderRadius: (aStyles['border-radius'] || '4').replace('px', ''),
                    fontSize: (aStyles['font-size'] || '18px').replace('px', ''),
                    textAlign: outerStyles['text-align'] || 'center'
                });
            } else if (block && block.type === 'product') {
                const html = block.content;
                const imgMatch = html.match(/<img[^>]*src="([^"]*)"/);
                const titleMatch = html.match(/<h3[^>]*>([^<]*)<\/h3>/);
                const priceMatch = html.match(/<p[^>]*>([^<]*)<\/p>/);
                const btnMatch = html.match(/<a[^>]*<ctrl42>[^>]*>([^<]*)<\/a>/) || html.match(/<a[^>]*>([^<]*)<\/a>/);
                const urlMatch = html.match(/href="([^"]*)"/);
                const btnColorMatch = html.match(/background:\s*(#[a-zA-Z0-9]+|rgb\([^)]+\))/);
                const btnTextColorMatch = html.match(/color:\s*(#[a-zA-Z0-9]+|white|rgb\([^)]+\))/);

                setProductStyle({
                    image: imgMatch ? imgMatch[1] : '',
                    title: titleMatch ? titleMatch[1] : '',
                    price: priceMatch ? priceMatch[1] : '',
                    buttonText: btnMatch ? btnMatch[1] : '',
                    buttonUrl: urlMatch ? urlMatch[1] : '#',
                    buttonColor: btnColorMatch ? btnColorMatch[1] : '#3B82F6',
                    buttonTextColor: btnTextColorMatch ? (btnTextColorMatch[1] === 'white' ? '#ffffff' : btnTextColorMatch[1]) : '#ffffff'
                });
            }
        }
    }, [selectedBlockId, contentBlocks]);

    const updateBlocks = (newBlocks, skipHistory = false) => {
        setContentBlocks(newBlocks);

        if (!skipHistory) {
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(newBlocks);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        }

        const html = `
            <div style="background-color: #F8F9FA; padding: 40px 0; font-family: 'Open Sans', sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    ${newBlocks.map(b => b.content).join('\n')}
                </div>
            </div>
        `;
        onChange(html, newBlocks);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const prevBlocks = history[historyIndex - 1];
            setHistoryIndex(historyIndex - 1);
            updateBlocks(prevBlocks, true);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const nextBlocks = history[historyIndex + 1];
            setHistoryIndex(historyIndex + 1);
            updateBlocks(nextBlocks, true);
        }
    };

    const handleStyleChange = (key, value) => {
        if (!selectedBlockId) return;
        const newTextStyle = { ...textStyle, [key]: value };
        setTextStyle(newTextStyle);

        const block = contentBlocks.find(b => b.id === selectedBlockId);
        if (!block || block.type !== 'text') return;

        const text = block.content.replace(/<[^>]*>/g, '');
        const styleStr = `font-family: '${newTextStyle.fontFamily}', sans-serif; line-height: ${newTextStyle.lineHeight}; font-size: ${newTextStyle.fontSize}px; color: ${newTextStyle.color}; text-align: ${newTextStyle.textAlign}; font-weight: ${newTextStyle.fontWeight}; font-style: ${newTextStyle.fontStyle}; text-decoration: ${newTextStyle.textDecoration}; padding: ${newTextStyle.padding}px;`;

        let newContent = '';
        if (block.content.includes('<h1')) {
            newContent = `<h1 style="${styleStr}">${text}</h1>`;
        } else {
            newContent = `<p style="${styleStr}">${text}</p>`;
        }

        const newBlocks = contentBlocks.map(b => b.id === selectedBlockId ? { ...b, content: newContent } : b);
        updateBlocks(newBlocks);
    };

    const handleButtonStyleChange = (key, value) => {
        if (!selectedBlockId) return;
        const newButtonStyle = { ...buttonStyle, [key]: value };
        setButtonStyle(newButtonStyle);

        const block = contentBlocks.find(b => b.id === selectedBlockId);
        if (!block || block.type !== 'button') return;

        const newContent = `<div style="text-align:${newButtonStyle.textAlign}; padding:20px;"><a href="${newButtonStyle.url}" style="background:${newButtonStyle.backgroundColor}; color:${newButtonStyle.color}; padding:15px 60px; text-decoration:none; border-radius:${newButtonStyle.borderRadius}px; font-weight:bold; font-family: 'Open Sans', sans-serif; display:inline-block; font-size: ${newButtonStyle.fontSize}px; text-transform: uppercase;">${newButtonStyle.text}</a></div>`;

        const newBlocks = contentBlocks.map(b => b.id === selectedBlockId ? { ...b, content: newContent } : b);
        updateBlocks(newBlocks);
    };

    const handleProductStyleChange = (key, value) => {
        if (!selectedBlockId) return;
        const newProductStyle = { ...productStyle, [key]: value };
        setProductStyle(newProductStyle);

        const block = contentBlocks.find(b => b.id === selectedBlockId);
        if (!block || block.type !== 'product') return;

        const newContent = `<div style="background: #ffffff; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 20px; font-family: 'Open Sans', sans-serif;"><img src="${newProductStyle.image}" style="width: 100%; display: block;" alt="Product Image" /><div style="padding: 20px; text-align: center;"><h3 style="margin: 0 0 10px 0; font-size: 20px; color: #1A202C;">${newProductStyle.title}</h3><p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #DE7441;">${newProductStyle.price}</p><a href="${newProductStyle.buttonUrl}" style="background: ${newProductStyle.buttonColor}; color: ${newProductStyle.buttonTextColor}; padding: 10px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; display: inline-block;">${newProductStyle.buttonText}</a></div></div>`;

        const newBlocks = contentBlocks.map(b => b.id === selectedBlockId ? { ...b, content: newContent } : b);
        updateBlocks(newBlocks);
    };

    const handleImageStyleChange = (key, value) => {
        if (!selectedBlockId) return;
        const newImageStyle = { ...imageStyle, [key]: value };
        setImageStyle(newImageStyle);

        const block = contentBlocks.find(b => b.id === selectedBlockId);
        if (!block || block.type !== 'image') return;

        const newContent = `<div style="margin-bottom: 20px; text-align: ${newImageStyle.textAlign};"><img src="${newImageStyle.src}" style="width: 100%; border-radius: ${newImageStyle.borderRadius}px;" alt="${newImageStyle.alt}" /></div>`;

        const newBlocks = contentBlocks.map(b => b.id === selectedBlockId ? { ...b, content: newContent } : b);
        updateBlocks(newBlocks);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!currentUser?.uid) {
            alert('Your session has expired. Please log in again.');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`/api/email-marketing/upload-image`, {
                method: 'POST',
                headers: {
                    'x-user-uid': currentUser.uid
                },
                body: formData
            });

            const contentType = response.headers.get("content-type");
            if (!response.ok) {
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Upload failed');
                } else {
                    const textError = await response.text();
                    console.error('Server error response:', textError);
                    throw new Error(`Server error (${response.status}). Please check backend logs.`);
                }
            }

            if (!contentType || contentType.indexOf("application/json") === -1) {
                throw new Error("Server did not return JSON. Is the backend running?");
            }

            const data = await response.json();
            handleImageStyleChange('src', data.url);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert(`Upload failed: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleAiGenerate = async () => {
        if (!aiPrompt) return;
        setAiLoading(true);

        await new Promise(r => setTimeout(r, 1500));

        let generatedText = "";
        const prompt = aiPrompt.toLowerCase();

        if (prompt.includes('spring') || prompt.includes('adventure')) {
            generatedText = "Spring is in the air! Experience nature like never before with our exclusive guided tours and premium outdoor gear.";
        } else if (prompt.includes('shop') || prompt.includes('sale')) {
            generatedText = "Huge Savings! Don't miss out on our seasonal sale. Grab your favorites now with up to 50% off sitewide.";
        } else if (prompt.includes('welcome') || prompt.includes('hello')) {
            generatedText = "Welcome to the family! We're so excited to have you with us. Stay tuned for incredible deals and insider updates.";
        } else {
            generatedText = `Here's a fresh take: ${aiPrompt}. We believe in quality and community, bringing you the best experience every single day.`;
        }

        if (selectedBlockId) {
            const block = contentBlocks.find(b => b.id === selectedBlockId);
            if (block && block.type === 'text') {
                const styleStr = `font-family: '${textStyle.fontFamily}', sans-serif; line-height: ${textStyle.lineHeight}; font-size: ${textStyle.fontSize}px; color: ${textStyle.color}; text-align: ${textStyle.textAlign}; font-weight: ${textStyle.fontWeight}; font-style: ${textStyle.fontStyle}; text-decoration: ${textStyle.textDecoration}; padding: ${textStyle.padding}px;`;
                const newContent = block.content.includes('<h1')
                    ? `<h1 style="${styleStr}">${generatedText}</h1>`
                    : `<p style="${styleStr}">${generatedText}</p>`;

                const newBlocks = contentBlocks.map(b => b.id === selectedBlockId ? { ...b, content: newContent } : b);
                updateBlocks(newBlocks);
            }
        } else {
            const newId = Math.random().toString(36).substr(2, 9);
            const newBlock = {
                id: newId,
                type: 'text',
                content: `<p style="font-family: 'Open Sans', sans-serif; line-height: 1.6; font-size: 16px; color: #333; text-align: left;">${generatedText}</p>`
            };
            updateBlocks([...contentBlocks, newBlock]);
            setSelectedBlockId(newId);
        }

        setAiLoading(false);
        setShowAiAssistant(false);
        setAiPrompt('');
    };

    const handleDragStart = (e, block) => {
        e.dataTransfer.setData('blockType', block.type);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        const y = e.clientY;
        const canvasBlocks = canvasRef.current.querySelectorAll('.eve-canvas-block');
        let index = canvasBlocks.length;
        for (let i = 0; i < canvasBlocks.length; i++) {
            const rect = canvasBlocks[i].getBoundingClientRect();
            if (y < rect.top + rect.height / 2) { index = i; break; }
        }
        setDragOverIndex(index);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('blockType');
        const block = blocks.find(b => b.type === type);
        if (block) {
            const newId = Math.random().toString(36).substr(2, 9);
            const newBlock = { id: newId, type: block.type, content: block.defaultContent };
            const newBlocks = [...contentBlocks];
            newBlocks.splice(dragOverIndex, 0, newBlock);
            updateBlocks(newBlocks);
            setSelectedBlockId(newId);
        }
        setDragOverIndex(null);
    };

    const handleBlockAdd = (blockType) => {
        const block = blocks.find(b => b.type === blockType);
        if (block) {
            const newId = Math.random().toString(36).substr(2, 9);
            const newBlock = { id: newId, type: block.type, content: block.defaultContent };
            const newBlocks = [...contentBlocks, newBlock];
            updateBlocks(newBlocks);
            setSelectedBlockId(newId);
        }
    };

    const removeBlock = (id) => {
        if (!id) return;
        const newBlocks = contentBlocks.filter(b => b.id !== id);
        updateBlocks(newBlocks);
        setSelectedBlockId(null);
    };

    const moveBlock = (id, direction) => {
        const index = contentBlocks.findIndex(b => b.id === id);
        if (index === -1) return;

        const newBlocks = [...contentBlocks];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex >= 0 && newIndex < newBlocks.length) {
            const temp = newBlocks[index];
            newBlocks[index] = newBlocks[newIndex];
            newBlocks[newIndex] = temp;
            updateBlocks(newBlocks);
        }
    };

    return (
        <div className="eve-container" onClick={() => setSelectedBlockId(null)}>
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Open+Sans:wght@400;600;700&family=Inter:wght@400;600;700&family=Roboto:wght@400;600;700&display=swap');
                    .active-btn { color: #3B82F6 !important; background: #F0F7FF !important; }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}
            </style>

            {/* Header */}
            <header className="eve-header" onClick={(e) => e.stopPropagation()}>
                <div className="eve-header-left">
                    <svg
                        width="24" height="24"
                        style={{ color: '#4A5568', cursor: 'pointer' }}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        onClick={onClose}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="eve-header-title">Campaign Editor</span>
                </div>

                <div className="eve-header-center">
                    <button
                        className="eve-header-btn"
                        onClick={handleUndo}
                        disabled={historyIndex <= 0}
                        style={{ opacity: historyIndex <= 0 ? 0.5 : 1 }}
                    >
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M3 10h10a8 8 0 018 8v2M3 10l5 5m-5-5l5-5" /></svg>
                        Undo
                    </button>
                    <button
                        className="eve-header-btn"
                        onClick={handleRedo}
                        disabled={historyIndex === history.length - 1}
                        style={{ opacity: historyIndex === history.length - 1 ? 0.5 : 1 }}
                    >
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M21 10H11a8 8 0 00-8 8v2m18-10l-5 5m5-5l-5-5" /></svg>
                        Redo
                    </button>
                    <button className="eve-header-btn" onClick={() => setShowPreview(true)}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Preview
                    </button>
                    <button className="eve-header-btn" onClick={() => { setShowSendModal(true); fetchRecipientLists(); }}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        Send
                    </button>
                </div>

                <button onClick={onSave} className="eve-save-btn">{saveButtonLabel}</button>
            </header>

            {/* Send Campaign Modal */}
            {showSendModal && (
                <div className="eve-preview-overlay" onClick={() => setShowSendModal(false)}>
                    <div className="eve-preview-modal" style={{ height: 'auto', maxHeight: '80vh', maxWidth: '600px', padding: '0' }} onClick={e => e.stopPropagation()}>
                        <div className="eve-ai-header">
                            <h4 style={{ fontSize: '18px' }}>Select Recipients</h4>
                            <button onClick={() => setShowSendModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#A0AEC0' }}>×</button>
                        </div>
                        <div style={{ padding: '24px', overflowY: 'auto' }}>
                            <p style={{ marginBottom: '16px', color: '#4A5568', fontSize: '14px' }}>Choose the audience segments for this campaign:</p>

                            {recipientLists.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#718096', background: '#F7FAFC', borderRadius: '8px' }}>
                                    No lists found. Please create a list in the Audience tab first.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {recipientLists.map(list => (
                                        <div
                                            key={list.id}
                                            onClick={() => {
                                                if (selectedListIds.includes(list.id)) {
                                                    setSelectedListIds(selectedListIds.filter(id => id !== list.id));
                                                } else {
                                                    setSelectedListIds([...selectedListIds, list.id]);
                                                }
                                            }}
                                            style={{
                                                padding: '16px',
                                                border: `2px solid ${selectedListIds.includes(list.id) ? '#3B82F6' : '#E2E8F0'}`,
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: selectedListIds.includes(list.id) ? '#F0F9FF' : 'white',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: '700', color: '#2D3748' }}>{list.name}</div>
                                                <div style={{ fontSize: '12px', color: '#718096' }}>{list.recipients?.length || 0} subscribers</div>
                                            </div>
                                            <div style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                border: `2px solid ${selectedListIds.includes(list.id) ? '#3B82F6' : '#CBD5E0'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {selectedListIds.includes(list.id) && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3B82F6' }} />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="eve-ai-footer" style={{ borderTop: '1px solid #E2E8F0' }}>
                            <button
                                onClick={() => setShowSendModal(false)}
                                style={{ padding: '10px 20px', border: '1px solid #E2E8F0', borderRadius: '6px', background: 'white', fontWeight: '600', color: '#4A5568', marginRight: '12px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onSend(selectedListIds);
                                    setShowSendModal(false);
                                }}
                                disabled={selectedListIds.length === 0}
                                className="eve-save-btn"
                                style={{ opacity: selectedListIds.length === 0 ? 0.5 : 1, cursor: selectedListIds.length === 0 ? 'not-allowed' : 'pointer' }}
                            >
                                Send Campaign
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="eve-meta-bar" onClick={(e) => e.stopPropagation()}>
                <div className="eve-meta-field">
                    <label>Campaign Title</label>
                    <input
                        type="text"
                        placeholder="e.g. Summer Sale 2024"
                        value={campaignName || ''}
                        onChange={(e) => onNameChange?.(e.target.value)}
                    />
                </div>
                <div className="eve-meta-field" style={{ flex: 2 }}>
                    <label>Subject Line</label>
                    <input
                        type="text"
                        placeholder="e.g. 50% Off Everything - Limited Time!"
                        value={campaignSubject || ''}
                        onChange={(e) => onSubjectChange?.(e.target.value)}
                    />
                </div>
            </div>

            <div className="eve-main-layout">
                {/* Left Sidebar */}
                <aside className="eve-sidebar-left" onClick={(e) => e.stopPropagation()}>
                    <h2 className="eve-sidebar-title">Content Blocks</h2>

                    {blocks.map(block => (
                        <div
                            key={block.type}
                            draggable
                            onDragStart={(e) => handleDragStart(e, block)}
                            onClick={() => handleBlockAdd(block.type)}
                            className="eve-block-card"
                        >
                            {block.icon}
                            <span className="eve-block-label">{block.label}</span>
                        </div>
                    ))}
                </aside>

                {/* Main Canvas */}
                <main
                    className="eve-canvas-area"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <div
                        ref={canvasRef}
                        className="eve-canvas-container"
                    >
                        {contentBlocks.map((block, index) => (
                            <React.Fragment key={block.id}>
                                {dragOverIndex === index && <div className="eve-drop-indicator" />}
                                <div
                                    onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); }}
                                    className={`eve-canvas-block ${selectedBlockId === block.id ? 'selected' : ''}`}
                                    style={{ padding: '4px', cursor: 'pointer' }}
                                >
                                    <div dangerouslySetInnerHTML={{ __html: block.content }} />

                                    {selectedBlockId === block.id && (
                                        <>
                                            <div style={{ position: 'absolute', inset: -4, border: '2px solid #3B82F6', pointerEvents: 'none', borderRadius: '4px', zIndex: 10 }} />
                                            <div style={{ position: 'absolute', right: '4px', top: '-12px', background: '#3B82F6', borderRadius: '4px', display: 'flex', gap: '2px', padding: '2px', zIndex: 11 }}>
                                                <button
                                                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: index === 0 ? 0.3 : 1 }}
                                                    disabled={index === 0}
                                                    onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                                                >
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M5 15l7-7 7 7" /></svg>
                                                </button>
                                                <button
                                                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: index === contentBlocks.length - 1 ? 0.3 : 1 }}
                                                    disabled={index === contentBlocks.length - 1}
                                                    onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                                                >
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M19 9l-7 7-7-7" /></svg>
                                                </button>
                                                <button
                                                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                                    onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                                                >
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* AI Assistant Overlay */}
                    {showAiAssistant && (
                        <div className="eve-ai-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="eve-ai-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ background: '#EBF4FF', padding: '4px', borderRadius: '4px' }}>
                                        <svg width="18" height="18" fill="#3B82F6" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" /></svg>
                                    </div>
                                    <h4 style={{ margin: 0 }}>AI Magic Writer</h4>
                                </div>
                                <button onClick={() => setShowAiAssistant(false)} style={{ background: 'none', border: 'none', color: '#A0AEC0', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                            </div>
                            <div style={{ padding: '20px' }}>
                                <textarea
                                    className="eve-textarea"
                                    style={{ border: '1px solid #E2E8F0', borderRadius: '8px', minHeight: '100px', marginBottom: '16px', background: '#F8FAFC' }}
                                    placeholder="What should I write about? (e.g. 'Spring sale announcement')"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    autoFocus
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                                    <button
                                        className="eve-header-btn"
                                        style={{ justifyContent: 'center', fontSize: '12px' }}
                                        onClick={() => setAiPrompt('Rephrase my current selection')}
                                    >Rephrase Selection</button>
                                    <button
                                        className="eve-header-btn"
                                        style={{ justifyContent: 'center', fontSize: '12px' }}
                                        onClick={() => setAiPrompt('Make it sound more exciting')}
                                    >Excited Tone</button>
                                </div>
                                <button
                                    className="eve-ai-gen-btn"
                                    style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    onClick={handleAiGenerate}
                                    disabled={aiLoading || !aiPrompt}
                                >
                                    {aiLoading ? (
                                        <>
                                            <div className="eve-spin" style={{ width: '14px', height: '14px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%' }}></div>
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" /></svg>
                                            Generate Copy
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </main>

                {/* Right Sidebar - Properties */}
                <aside className="eve-sidebar-right" onClick={(e) => e.stopPropagation()}>
                    <h2 className="eve-sidebar-title">Properties</h2>
                    {!selectedBlockId ? (
                        <div className="eve-empty-state">
                            <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#CBD5E0', marginBottom: '16px' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                            <p>Select a block on the canvas to edit its properties</p>
                        </div>
                    ) : (
                        <div className="eve-props-scroll">
                            {contentBlocks.find(b => b.id === selectedBlockId)?.type === 'text' && (
                                <div className="eve-prop-group">
                                    <label className="eve-prop-label">Typography</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '12px' }}>
                                        <button
                                            className={`eve-prop-btn ${textStyle.textAlign === 'left' ? 'active-btn' : ''}`}
                                            onClick={() => handleStyleChange('textAlign', 'left')}
                                        >
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h16" /></svg>
                                        </button>
                                        <button
                                            className={`eve-prop-btn ${textStyle.textAlign === 'center' ? 'active-btn' : ''}`}
                                            onClick={() => handleStyleChange('textAlign', 'center')}
                                        >
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M4 18h16" /></svg>
                                        </button>
                                        <button
                                            className={`eve-prop-btn ${textStyle.textAlign === 'right' ? 'active-btn' : ''}`}
                                            onClick={() => handleStyleChange('textAlign', 'right')}
                                        >
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M10 12h10M4 18h16" /></svg>
                                        </button>
                                        <button
                                            className={`eve-prop-btn ${textStyle.fontWeight === 'bold' ? 'active-btn' : ''}`}
                                            onClick={() => handleStyleChange('fontWeight', textStyle.fontWeight === 'bold' ? 'normal' : 'bold')}
                                        >
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6V4zm0 8h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z" /></svg>
                                        </button>
                                    </div>

                                    <div className="eve-prop-field">
                                        <label>Font Size</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="range" min="12" max="72"
                                                value={textStyle.fontSize}
                                                onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                                                style={{ flex: 1 }}
                                            />
                                            <span style={{ fontSize: '12px', fontWeight: '600', width: '30px' }}>{textStyle.fontSize}</span>
                                        </div>
                                    </div>

                                    <div className="eve-prop-field">
                                        <label>Curated Palettes</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {['#0F172A', '#334155', '#475569', '#64748B', '#94A3B8', '#CBD5E1'].map(c => (
                                                    <div key={c} onClick={() => handleStyleChange('color', c)} style={{ width: '20px', height: '20px', background: c, borderRadius: '50%', cursor: 'pointer', border: textStyle.color === c ? '2px solid #3B82F6' : '1px solid #E2E8F0' }} title="Business" />
                                                ))}
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {['#DC2626', '#D97706', '#059669', '#2563EB', '#7C3AED', '#DB2777'].map(c => (
                                                    <div key={c} onClick={() => handleStyleChange('color', c)} style={{ width: '20px', height: '20px', background: c, borderRadius: '50%', cursor: 'pointer', border: textStyle.color === c ? '2px solid #3B82F6' : '1px solid #E2E8F0' }} title="Vibrant" />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="eve-prop-field">
                                        <label>Custom Color Picker</label>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#F1F5F9', padding: '8px', borderRadius: '8px' }}>
                                            <input
                                                type="color"
                                                value={textStyle.color}
                                                onChange={(e) => handleStyleChange('color', e.target.value)}
                                                style={{ width: '40px', height: '40px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                                                id="text-color-picker"
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', marginBottom: '2px' }}>Pick Visually</div>
                                                <input
                                                    type="text"
                                                    value={textStyle.color}
                                                    onChange={(e) => handleStyleChange('color', e.target.value)}
                                                    style={{ width: '100%', fontSize: '13px', border: 'none', background: 'transparent', padding: 0, fontWeight: '600' }}
                                                    placeholder="#000000"
                                                />
                                            </div>
                                            <label htmlFor="text-color-picker" style={{ cursor: 'pointer', color: '#3B82F6' }}>
                                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </label>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setShowAiAssistant(true)}
                                        className="eve-ai-btn"
                                        style={{ width: '100%', marginTop: '20px' }}
                                    >
                                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" /></svg>
                                        Magic AI Writer
                                    </button>
                                </div>
                            )}

                            {contentBlocks.find(b => b.id === selectedBlockId)?.type === 'image' && (
                                <div className="eve-prop-group">
                                    <label className="eve-prop-label">Image Settings</label>
                                    <div className="eve-prop-field">
                                        <label>Replace Image</label>
                                        <button
                                            onClick={() => document.getElementById('image-upload').click()}
                                            disabled={uploading}
                                            className="eve-header-btn"
                                            style={{ width: '100%', justifyContent: 'center', background: '#F8FAFC', padding: '12px' }}
                                        >
                                            {uploading ? 'Uploading...' : 'Upload New Image'}
                                        </button>
                                        <input
                                            id="image-upload"
                                            type="file"
                                            hidden
                                            onChange={handleImageUpload}
                                            accept="image/*"
                                        />
                                    </div>
                                    <div className="eve-prop-field">
                                        <label>Corner Radius</label>
                                        <input
                                            type="range" min="0" max="50"
                                            value={imageStyle.borderRadius}
                                            onChange={(e) => handleImageStyleChange('borderRadius', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {contentBlocks.find(b => b.id === selectedBlockId)?.type === 'button' && (
                                <div className="eve-prop-group">
                                    <label className="eve-prop-label">Button Settings</label>
                                    <div className="eve-prop-field">
                                        <label>Button Text</label>
                                        <input
                                            type="text"
                                            value={buttonStyle.text}
                                            onChange={(e) => handleButtonStyleChange('text', e.target.value)}
                                        />
                                    </div>
                                    <div className="eve-prop-field">
                                        <label>Link URL</label>
                                        <input
                                            type="text"
                                            placeholder="https://..."
                                            value={buttonStyle.url}
                                            onChange={(e) => handleButtonStyleChange('url', e.target.value)}
                                        />
                                    </div>
                                    <div className="eve-prop-field">
                                        <label>Curated Themes</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                            {[
                                                { b: '#000000', t: '#FFFFFF' },
                                                { b: '#3B82F6', t: '#FFFFFF' },
                                                { b: '#10B981', t: '#FFFFFF' },
                                                { b: '#F59E0B', t: '#FFFFFF' },
                                                { b: '#EF4444', t: '#FFFFFF' },
                                                { b: '#F3F4F6', t: '#1F2937' }
                                            ].map((theme, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => {
                                                        handleButtonStyleChange('backgroundColor', theme.b);
                                                        handleButtonStyleChange('color', theme.t);
                                                    }}
                                                    style={{ width: '32px', height: '32px', background: theme.b, border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    title="Quick Theme"
                                                >
                                                    <div style={{ width: '10px', height: '2px', background: theme.t, borderRadius: '1px' }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="eve-prop-field">
                                        <label>Button Text Color</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {['#000000', '#FFFFFF', '#3B82F6', '#EF4444', '#10B981', '#F59E0B'].map(c => (
                                                    <div key={c} onClick={() => handleButtonStyleChange('color', c)} style={{ width: '18px', height: '18px', background: c, borderRadius: '50%', cursor: 'pointer', border: buttonStyle.color === c ? '2px solid #3B82F6' : '1px solid #E2E8F0' }} />
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#F1F5F9', padding: '8px', borderRadius: '8px' }}>
                                            <input
                                                type="color"
                                                value={buttonStyle.color}
                                                onChange={(e) => handleButtonStyleChange('color', e.target.value)}
                                                style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                                                id="btn-text-picker"
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748B' }}>Pick Custom</div>
                                                <input
                                                    type="text"
                                                    value={buttonStyle.color}
                                                    onChange={(e) => handleButtonStyleChange('color', e.target.value)}
                                                    style={{ width: '100%', fontSize: '13px', border: 'none', background: 'transparent', padding: 0, fontWeight: '600' }}
                                                    placeholder="#FFFFFF"
                                                />
                                            </div>
                                            <label htmlFor="btn-text-picker" style={{ cursor: 'pointer', color: '#3B82F6' }}>
                                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="eve-prop-field">
                                        <label>Button Background</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {['#0F172A', '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#FFFFFF'].map(c => (
                                                    <div key={c} onClick={() => handleButtonStyleChange('backgroundColor', c)} style={{ width: '18px', height: '18px', background: c, borderRadius: '50%', cursor: 'pointer', border: buttonStyle.backgroundColor === c ? '2px solid #3B82F6' : '1px solid #E2E8F0' }} />
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#F1F5F9', padding: '8px', borderRadius: '8px' }}>
                                            <input
                                                type="color"
                                                value={buttonStyle.backgroundColor}
                                                onChange={(e) => handleButtonStyleChange('backgroundColor', e.target.value)}
                                                style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                                                id="btn-bg-picker"
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748B' }}>Pick Custom</div>
                                                <input
                                                    type="text"
                                                    value={buttonStyle.backgroundColor}
                                                    onChange={(e) => handleButtonStyleChange('backgroundColor', e.target.value)}
                                                    style={{ width: '100%', fontSize: '13px', border: 'none', background: 'transparent', padding: 0, fontWeight: '600' }}
                                                    placeholder="#000000"
                                                />
                                            </div>
                                            <label htmlFor="btn-bg-picker" style={{ cursor: 'pointer', color: '#3B82F6' }}>
                                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="eve-prop-field">
                                        <label>Button Shape (Corner Radius)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="range" min="0" max="50"
                                                value={buttonStyle.borderRadius}
                                                onChange={(e) => handleButtonStyleChange('borderRadius', e.target.value)}
                                                style={{ flex: 1 }}
                                            />
                                            <span style={{ fontSize: '12px', fontWeight: '600', width: '30px' }}>{buttonStyle.borderRadius}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {contentBlocks.find(b => b.id === selectedBlockId)?.type === 'product' && (
                                <div className="eve-prop-group">
                                    <label className="eve-prop-label">Product Details</label>
                                    <div className="eve-prop-field">
                                        <label>Update Product Image</label>
                                        <button
                                            onClick={() => document.getElementById('product-image-upload').click()}
                                            disabled={uploading}
                                            className="eve-header-btn"
                                            style={{ width: '100%', justifyContent: 'center', background: '#F8FAFC', padding: '12px' }}
                                        >
                                            {uploading ? 'Uploading...' : 'Upload Product Image'}
                                        </button>
                                        <input
                                            id="product-image-upload"
                                            type="file"
                                            hidden
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                setUploading(true);
                                                const formData = new FormData();
                                                formData.append('image', file);
                                                try {
                                                    const response = await fetch(`/api/email-marketing/upload-image`, {
                                                        method: 'POST',
                                                        headers: { 'x-user-uid': currentUser.uid },
                                                        body: formData
                                                    });
                                                    const data = await response.json();
                                                    handleProductStyleChange('image', data.url);
                                                } catch (err) { alert('Upload failed'); }
                                                finally { setUploading(false); }
                                            }}
                                            accept="image/*"
                                        />
                                    </div>
                                    <div className="eve-prop-field">
                                        <label>Product Name</label>
                                        <input
                                            type="text"
                                            value={productStyle.title}
                                            onChange={(e) => handleProductStyleChange('title', e.target.value)}
                                        />
                                    </div>
                                    <div className="eve-prop-field">
                                        <label>Price</label>
                                        <input
                                            type="text"
                                            value={productStyle.price}
                                            onChange={(e) => handleProductStyleChange('price', e.target.value)}
                                        />
                                    </div>
                                    <div className="eve-prop-field">
                                        <label>Button Label</label>
                                        <input
                                            type="text"
                                            value={productStyle.buttonText}
                                            onChange={(e) => handleProductStyleChange('buttonText', e.target.value)}
                                        />
                                    </div>
                                    <div className="eve-prop-field">
                                        <label>Button URL</label>
                                        <input
                                            type="text"
                                            value={productStyle.buttonUrl}
                                            onChange={(e) => handleProductStyleChange('buttonUrl', e.target.value)}
                                        />
                                    </div>
                                    <div className="eve-prop-field">
                                        <label>Button Text Color</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="color"
                                                value={productStyle.buttonTextColor}
                                                onChange={(e) => handleProductStyleChange('buttonTextColor', e.target.value)}
                                                style={{ width: '40px', height: '40px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                                            />
                                            <input
                                                type="text"
                                                value={productStyle.buttonTextColor}
                                                onChange={(e) => handleProductStyleChange('buttonTextColor', e.target.value)}
                                                style={{ flex: 1 }}
                                            />
                                        </div>
                                    </div>
                                    <div className="eve-prop-field">
                                        <label>Button Background</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="color"
                                                value={productStyle.buttonColor}
                                                onChange={(e) => handleProductStyleChange('buttonColor', e.target.value)}
                                                style={{ width: '40px', height: '40px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                                            />
                                            <input
                                                type="text"
                                                value={productStyle.buttonColor}
                                                onChange={(e) => handleProductStyleChange('buttonColor', e.target.value)}
                                                style={{ flex: 1 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </aside>
            </div>
            {/* Preview Modal */}
            {showPreview && (
                <div className="eve-preview-overlay" onClick={() => setShowPreview(false)}>
                    <div className="eve-preview-modal" onClick={e => e.stopPropagation()}>
                        <div className="eve-ai-header" style={{ padding: '12px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <h4 style={{ margin: 0 }}>Campaign Preview</h4>
                                <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                                    <button
                                        className={`eve-device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                                        onClick={() => setPreviewDevice('desktop')}
                                    >Desktop</button>
                                    <button
                                        className={`eve-device-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
                                        onClick={() => setPreviewDevice('mobile')}
                                    >Mobile</button>
                                </div>
                            </div>
                            <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', color: '#A0AEC0', cursor: 'pointer', fontSize: '24px' }}>✕</button>
                        </div>
                        <div style={{ flex: 1, background: '#F1F5F9', overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: previewDevice === 'mobile' ? '40px 0' : '0' }}>
                            <div style={{
                                width: '100%',
                                maxWidth: previewDevice === 'mobile' ? '375px' : '100%',
                                background: 'white',
                                height: 'fit-content',
                                minHeight: '100%',
                                boxShadow: previewDevice === 'mobile' ? '0 20px 50px rgba(0,0,0,0.1)' : 'none',
                                borderRadius: previewDevice === 'mobile' ? '32px' : '0',
                                border: previewDevice === 'mobile' ? '12px solid #1E293B' : 'none',
                                overflow: 'hidden',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}>
                                <div style={{ background: '#F8F9FA', padding: '40px 0', minHeight: '100%' }}>
                                    <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', padding: '40px' }}>
                                        {contentBlocks.map(block => (
                                            <div key={block.id} dangerouslySetInnerHTML={{ __html: block.content }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailVisualEditor;
