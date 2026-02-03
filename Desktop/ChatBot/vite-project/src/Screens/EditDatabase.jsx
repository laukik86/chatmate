import React, { useState } from 'react';
import axios from 'axios';
import { Search, Save, Database, Loader2 } from 'lucide-react';

const EditDatabase = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    // 1. Fetch the Top 5 results from the database
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query) return;

        setLoading(true);
        try {
            // This calls your Node.js backend
            const response = await axios.post('/api/get-records', { query });
            setResults(response.data.results || []);
        } catch (error) {
            console.error("Error fetching data:", error);
            alert("Failed to fetch records. Check if Flask and Node are running.");
        } finally {
            setLoading(false);
        }
    };

    // 2. Update a specific record in Pinecone
    const handleUpdate = async (id, newText) => {
        setUpdatingId(id);
        try {
            // This calls your Node.js backend
            await axios.post('/api/update-record', { id, new_text: newText });
            alert("Record updated successfully in Pinecone!");
        } catch (error) {
            console.error("Update failed:", error);
            alert("Failed to update record.");
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Database size={32} color="#2563eb" />
                <h1>Vector Database Editor</h1>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for content to edit (e.g. 'M.Tech Eligibility')..."
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
                />
                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                    Search
                </button>
            </form>

            <hr style={{ border: '0', borderTop: '1px solid #eee', marginBottom: '30px' }} />

            {/* Results List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {results.length === 0 && !loading && (
                    <p style={{ textAlign: 'center', color: '#666' }}>Search above to find and edit database chunks.</p>
                )}

                {results.map((item) => (
                    <div key={item.id} style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '12px', backgroundColor: '#f9fafb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>ID: {item.id}</span>
                            <span style={{ fontSize: '12px', color: '#10b981' }}>Similarity: {(item.score * 100).toFixed(1)}%</span>
                        </div>
                        
                        <textarea
                            id={`text-${item.id}`}
                            defaultValue={item.current_text}
                            rows={5}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', lineHeight: '1.5', marginBottom: '10px', boxSizing: 'border-box' }}
                        />

                        <button
                            onClick={() => handleUpdate(item.id, document.getElementById(`text-${item.id}`).value)}
                            disabled={updatingId === item.id}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                padding: '8px 16px', 
                                backgroundColor: updatingId === item.id ? '#9ca3af' : '#059669', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '6px', 
                                cursor: 'pointer' 
                            }}
                        >
                            {updatingId === item.id ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {updatingId === item.id ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EditDatabase;