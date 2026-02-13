'use client';

import { useState } from 'react';
import Image from 'next/image';

const LANGUAGES = [
  { code: 'ku', name: 'Kurdish', flag: '🇮🇶' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
];

export default function Home() {
  const [formData, setFormData] = useState({
    childName: '',
    storyTheme: '',
    languages: [] as string[],
    photoFile: null as File | null,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLanguageToggle = (langCode: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.includes(langCode)
        ? prev.languages.filter((l) => l !== langCode)
        : [...prev.languages, langCode],
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, photoFile: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.childName.trim()) {
      setError('Please enter the child\'s name');
      return;
    }
    if (!formData.storyTheme.trim()) {
      setError('Please describe what the story should be about');
      return;
    }
    if (formData.languages.length === 0) {
      setError('Please select at least one language');
      return;
    }
    if (!formData.photoFile) {
      setError('Please upload a photo of the child');
      return;
    }

    setIsGenerating(true);

    try {
      // Step 1: Upload photo and generate character
      const photoFormData = new FormData();
      photoFormData.append('photo', formData.photoFile);
      
      const characterRes = await fetch('/api/generate-character', {
        method: 'POST',
        body: photoFormData,
      });

      if (!characterRes.ok) {
        throw new Error('Failed to generate character');
      }

      const { characterImageUrl } = await characterRes.json();

      // Step 2: Generate story
      const storyRes = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName: formData.childName,
          storyTheme: formData.storyTheme,
          languages: formData.languages,
          characterImageUrl,
        }),
      });

      if (!storyRes.ok) {
        throw new Error('Failed to generate story');
      }

      const { storyContent } = await storyRes.json();

      // Step 3: Generate PDF
      const pdfRes = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName: formData.childName,
          languages: formData.languages,
          storyContent,
          characterImageUrl,
        }),
      });

      if (!pdfRes.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Download PDF
      const blob = await pdfRes.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.childName}-storybook.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Reset form
      setFormData({
        childName: '',
        storyTheme: '',
        languages: [],
        photoFile: null,
      });
      setPhotoPreview(null);
      alert('🎉 Your storybook has been created and downloaded!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📚 Kurdish Children&apos;s Storybook Creator
          </h1>
          <p className="text-gray-600">
            Create personalized multilingual storybooks for your child
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Child Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Child&apos;s Name *
            </label>
            <input
              type="text"
              value={formData.childName}
              onChange={(e) => setFormData((prev) => ({ ...prev, childName: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your child's name"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Child&apos;s Photo *
            </label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {photoPreview && (
                <Image
                  src={photoPreview}
                  alt="Preview"
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              We&apos;ll create a cartoon character from this photo
            </p>
          </div>

          {/* Story Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What should the story be about? *
            </label>
            <textarea
              value={formData.storyTheme}
              onChange={(e) => setFormData((prev) => ({ ...prev, storyTheme: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="E.g., A brave adventure in the mountains, learning about friendship, a magical journey through space..."
            />
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Language(s) * (Choose 1-4)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageToggle(lang.code)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.languages.includes(lang.code)
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{lang.flag}</div>
                  <div className="text-sm font-medium">{lang.name}</div>
                </button>
              ))}
            </div>
            {formData.languages.length >= 2 && (
              <p className="text-xs text-blue-600 mt-2">
                ✨ Bilingual mode: Each page will show {formData.languages.length} languages side-by-side for learning!
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isGenerating}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
              isGenerating
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg'
            }`}
          >
            {isGenerating ? '✨ Creating Your Storybook...' : '📖 Create Storybook'}
          </button>
        </form>

        {/* Loading State */}
        {isGenerating && (
          <div className="mt-6 bg-blue-50 border border-blue-200 text-blue-700 px-6 py-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
              <div>
                <p className="font-semibold">Creating magic... ✨</p>
                <p className="text-sm">This may take 1-2 minutes. Please don&apos;t close this page.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
