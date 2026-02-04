import React, { useState } from 'react';
import axios from 'axios';
import { Search, Save, Database, Loader2 } from 'lucide-react';

// Use the VITE_ prefix for environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EditDatabase = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    // 1. Fetch results from the database
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query) return;

        setLoading(true);
        try {
            // Updated to use production URL
            const response = await axios.post(`${API_BASE_URL}/api/get-records`, { query });
            setResults(response.data.results || []);
        } catch (error) {
            console.error("Error fetching data:", error);
            alert("Failed to fetch records. Make sure the Render backend and Flask service are linked.");
        } finally {
            setLoading(false);
        }
    };

    // 2. Update a specific record
    const handleUpdate = async (id, newText) => {
        setUpdatingId(id);
        try {
            // Updated to use production URL
            await axios.post(`${API_BASE_URL}/api/update-record`, { id, new_text: newText });
            alert("Record updated successfully!");
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
                <h1 style={{ color: '#f8fafc' }}>Vector Database Editor</h1>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for content to edit (e.g. 'M.Tech Eligibility')..."
                    style={{ 
                        flex: 1, 
                        padding: '12px', 
                        borderRadius: '8px', 
                        border: '1px solid #334155', 
                        fontSize: '16px',
                        backgroundColor: '#1e293b',
                        color: 'white' 
                    }}
                />
                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ 
                        padding: '10px 20px', 
                        backgroundColor: '#2563eb', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '5px' 
                    }}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                    Search
                </button>
            </form>

            <hr style={{ border: '0', borderTop: '1px solid #334155', marginBottom: '30px' }} />

            {/* Results List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {results.length === 0 && !loading && (
                    <p style={{ textAlign: 'center', color: '#94a3b8' }}>Search above to find and edit database chunks.</p>
                )}

                {results.map((item) => (
                    <div key={item.id} style={{ 
                        padding: '20px', 
                        border: '1px solid #334155', 
                        borderRadius: '12px', 
                        backgroundColor: '#0f172a' 
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>
                                ID: {item.id}
                            </span>
                            <span style={{ fontSize: '12px', color: '#10b981' }}>
                                Similarity: {(item.score * 100).toFixed(1)}%
                            </span>
                        </div>
                        
                        <textarea
                            id={`text-${item.id}`}
                            defaultValue={item.current_text}
                            rows={5}
                            style={{ 
                                width: '100%', 
                                padding: '10px', 
                                borderRadius: '6px', 
                                border: '1px solid #334155', 
                                fontSize: '14px', 
                                lineHeight: '1.5', 
                                marginBottom: '10px', 
                                boxSizing: 'border-box',
                                backgroundColor: '#1e293b',
                                color: '#e2e8f0'
                            }}
                        />

                        <button
                            onClick={() => handleUpdate(item.id, document.getElementById(`text-${item.id}`).value)}
                            disabled={updatingId === item.id}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                padding: '8px 16px', 
                                backgroundColor: updatingId === item.id ? '#475569' : '#059669', 
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