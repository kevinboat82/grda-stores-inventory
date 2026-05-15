import React, { useEffect, useState } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { FileText, ExternalLink } from 'lucide-react';

/**
 * Reliable PDF/image preview: resolves Storage path to a fresh URL and uses blob iframe when needed.
 */
const DocumentPreview = ({ fileUrl, fileName, storagePath }) => {
    const [previewUrl, setPreviewUrl] = useState('');
    const [loadError, setLoadError] = useState('');
    const [loading, setLoading] = useState(true);

    const lowerName = (fileName || '').toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || (fileUrl || '').toLowerCase().includes('.pdf');
    const isImage = /\.(jpg|jpeg|png|webp)$/i.test(fileName || '');

    useEffect(() => {
        let objectUrl = null;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setLoadError('');
            try {
                let url = fileUrl || '';
                if (storagePath) {
                    url = await getDownloadURL(ref(storage, storagePath));
                }
                if (!url) {
                    setLoadError('No file URL available.');
                    return;
                }

                if (isPdf) {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`Could not load PDF (${res.status})`);
                    const blob = await res.blob();
                    objectUrl = URL.createObjectURL(blob);
                    if (!cancelled) setPreviewUrl(objectUrl);
                } else if (!cancelled) {
                    setPreviewUrl(url);
                }
            } catch (err) {
                console.error('[DocumentPreview]', err);
                if (!cancelled) {
                    setLoadError(err.message || 'Preview failed');
                    if (fileUrl) setPreviewUrl(fileUrl);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [fileUrl, fileName, storagePath, isPdf]);

    if (loading) {
        return <p className="text-muted text-sm">Loading preview…</p>;
    }

    if (!previewUrl && loadError) {
        return (
            <div className="no-preview">
                <FileText size={48} />
                <p>{loadError}</p>
                {fileUrl && (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ marginTop: '0.75rem' }}>
                        <ExternalLink size={16} /> Open in new tab
                    </a>
                )}
            </div>
        );
    }

    if (isPdf && previewUrl) {
        return (
            <iframe
                src={previewUrl}
                className="pdf-viewer"
                title={fileName || 'Document preview'}
                style={{ width: '100%', minHeight: '520px', border: 'none', borderRadius: '8px' }}
            />
        );
    }

    if (isImage && previewUrl) {
        return <img src={previewUrl} alt={fileName || 'Document'} className="image-viewer" style={{ maxWidth: '100%' }} />;
    }

    return (
        <div className="no-preview">
            <FileText size={48} />
            <p>Preview not available for this file type.</p>
            {fileUrl && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ marginTop: '0.75rem' }}>
                    <ExternalLink size={16} /> Open file
                </a>
            )}
        </div>
    );
};

export default DocumentPreview;
