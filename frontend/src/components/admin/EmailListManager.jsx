import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const EmailListManager = () => {
    const [lists, setLists] = useState([]);
    const [allContacts, setAllContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [listName, setListName] = useState('');
    const [selectedContacts, setSelectedContacts] = useState([]);
    const { currentUser } = useAuth();

    const API_URL = "http://localhost:5000/api";

    useEffect(() => {
        fetchLists();
        fetchContacts();
    }, []);

    const fetchLists = async () => {
        if (!currentUser?.uid) return;
        try {
            const response = await fetch(`${API_URL}/email-marketing/lists`, {
                headers: { 'x-user-uid': currentUser.uid }
            });
            if (response.ok) {
                const data = await response.json();
                setLists(Array.isArray(data) ? data : []);
            } else {
                const text = await response.text();
                console.error(`Fetch lists failed:`, text.substring(0, 100));
            }
        } catch (err) {
            console.error("Fetch lists error:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchContacts = async () => {
        if (!currentUser?.uid) return;
        try {
            const [sysRes, custRes] = await Promise.all([
                fetch(`${API_URL}/email-marketing/system-users`, { headers: { 'x-user-uid': currentUser.uid } }),
                fetch(`${API_URL}/email-marketing/customers`, { headers: { 'x-user-uid': currentUser.uid } })
            ]);

            let sysData = [];
            if (sysRes.ok) sysData = await sysRes.json();

            let custData = [];
            if (custRes.ok) custData = await custRes.json();

            const combined = [
                ...sysData.map(u => ({ ...u, source: 'System', type: 'staff' })),
                ...custData.map(c => ({ ...c, source: 'Marketing', type: 'customer' }))
            ];

            setAllContacts(combined);
        } catch (err) {
            console.error("Fetch contacts error:", err);
        }
    };

    const handleCreateList = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/email-marketing/lists`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser?.uid
                },
                body: JSON.stringify({
                    name: listName,
                    emails: selectedContacts.map(id => {
                        const contact = allContacts.find(c => c.id === id);
                        return { email: contact.email, name: contact.name, tags: contact.tags, source: contact.source };
                    })
                })
            });
            if (response.ok) {
                fetchLists();
                setIsModalOpen(false);
                setListName('');
                setSelectedContacts([]);
            }
        } catch (err) {
            setError("Failed to create list");
        }
    };

    const handleDeleteList = async (id) => {
        if (!window.confirm("Permanent erasure of this segment?")) return;
        try {
            const response = await fetch(`${API_URL}/email-marketing/lists/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-uid': currentUser.uid }
            });
            if (response.ok) fetchLists();
        } catch (err) {
            console.error(err);
        }
    };

    const toggleContactSelection = (id) => {
        setSelectedContacts(prev =>
            prev.includes(id) ? prev.filter(cur => cur !== id) : [...prev, id]
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-12">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Market Segments</h1>
                    <p className="text-slate-500 font-medium mt-1">Targeted audience groups for precision communication.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black shadow-2xl hover:-translate-y-1 transition-all text-xs uppercase tracking-[0.2em]"
                >
                    Provision New Segment
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {lists.map(list => (
                    <div key={list.id} className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-[40px] flex items-center justify-center text-slate-200 font-black italic">
                            #{lists.indexOf(list) + 1}
                        </div>

                        <div className="flex flex-col h-full">
                            <div className="mb-8">
                                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 mb-6">🎯</div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2">{list.name}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                                        {list.recipients?.length || 0} Core Subscribers
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs text-slate-400 font-medium leading-relaxed flex-1">
                                High-priority segment derived from {list.recipients?.[0]?.source || 'Mixed'} protocols.
                            </p>

                            <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-50">
                                <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Inspect Recipients</button>
                                <button
                                    onClick={() => handleDeleteList(list.id)}
                                    className="text-[10px] font-black text-rose-300 uppercase tracking-widest hover:text-rose-600 transition-colors"
                                >
                                    Decommission
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {lists.length === 0 && !loading && (
                    <div className="col-span-full py-40 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-20 h-20 bg-white shadow-sm rounded-full flex items-center justify-center grayscale opacity-20 text-3xl italic">?</div>
                        <div className="space-y-2">
                            <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Zero Segments Initialized</p>
                            <p className="text-slate-300 text-xs font-medium max-w-xs mx-auto">Create your first strategic segment by aggregating contacts into a targeted list.</p>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[50px] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)]">
                        <div className="p-12 border-b border-slate-50 flex justify-between items-center bg-white">
                            <div>
                                <h3 className="text-3xl font-black text-slate-900 italic tracking-tight">Segment Architect</h3>
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-2">Precision Targeting Core</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-900 transition-colors p-2">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 space-y-12">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Identify Segment Name</label>
                                <input
                                    type="text"
                                    required
                                    value={listName}
                                    onChange={e => setListName(e.target.value)}
                                    placeholder="e.g. Q3 High-Priority Leads"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-[20px] focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all py-6 px-8 font-black text-slate-900 text-lg outline-none italic"
                                />
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate Injection ({allContacts.length} available)</label>
                                    <button
                                        onClick={() => setSelectedContacts(allContacts.map(u => u.id))}
                                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                    >
                                        Select All Candidates
                                    </button>
                                </div>
                                <div className="border border-slate-100 rounded-[30px] overflow-hidden shadow-sm bg-slate-50/50">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <tr>
                                                <th className="px-8 py-5 w-10">Select</th>
                                                <th className="px-8 py-5">Full Identity</th>
                                                <th className="px-8 py-5">Origin Protocol</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {allContacts.map(contact => (
                                                <tr key={contact.id} className="hover:bg-white transition-colors cursor-pointer" onClick={() => toggleContactSelection(contact.id)}>
                                                    <td className="px-8 py-6">
                                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedContacts.includes(contact.id) ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white border-slate-200'}`}>
                                                            {selectedContacts.includes(contact.id) && <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{contact.name || contact.email.split('@')[0]}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 font-mono tracking-tight">{contact.email}</p>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <span className={`text-[9px] font-black px-3 py-1 rounded-md uppercase tracking-widest border ${contact.source === 'System' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                                                            {contact.source}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="p-12 border-t border-slate-50 bg-slate-50/10 flex justify-between items-center">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span className="text-indigo-600">{selectedContacts.length}</span> Records in Payload
                            </div>
                            <div className="flex gap-6">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-8 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900 transition-colors"
                                >
                                    Abort Operation
                                </button>
                                <button
                                    onClick={handleCreateList}
                                    className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black shadow-2xl hover:bg-slate-900 hover:-translate-y-1 transition-all disabled:opacity-20 text-[10px] uppercase tracking-widest"
                                    disabled={!listName || selectedContacts.length === 0}
                                >
                                    COMMIT SEGMENT -&gt;
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailListManager;
