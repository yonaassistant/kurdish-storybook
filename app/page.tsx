'use client';

import { useState } from 'react';
import Image from 'next/image';

const LANGUAGES = [
  { code: 'ku', name: 'Kurdish', flag: '🇮🇶', color: 'bg-red-500' },
  { code: 'en', name: 'English', flag: '🇬🇧', color: 'bg-blue-500' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', color: 'bg-green-500' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷', color: 'bg-red-600' },
];

export default function Home() {
  const [isDark, setIsDark] = useState(false);
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
    setFormData((prev) => {
      const currentLangs = prev.languages;
      
      // If already selected, remove it
      if (currentLangs.includes(langCode)) {
        return { ...prev, languages: currentLangs.filter((l) => l !== langCode) };
      }
      
      // If max 2 languages reached, don't add
      if (currentLangs.length >= 2) {
        setError('Maximum 2 languages allowed');
        setTimeout(() => setError(null), 2000);
        return prev;
      }
      
      // Add the language
      return { ...prev, languages: [...currentLangs, langCode] };
    });
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
      console.log('Generating PDF...');
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

      console.log('PDF response status:', pdfRes.status);
      console.log('PDF response headers:', pdfRes.headers.get('content-type'));

      if (!pdfRes.ok) {
        const errorText = await pdfRes.text();
        console.error('PDF error response:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to generate PDF');
        } catch {
          throw new Error(`Failed to generate PDF: ${pdfRes.status} - ${errorText.substring(0, 100)}`);
        }
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
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50'
    }`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header with Dark Mode Toggle */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-4xl md:text-5xl font-bold mb-2 ${
              isDark ? 'text-white' : 'text-gray-800'
            }`}>
              📚 Kurdish Storybook Creator
            </h1>
            <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Create personalized multilingual stories for children
            </p>
          </div>
          
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-3 rounded-full transition-all ${
              isDark 
                ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300' 
                : 'bg-gray-800 text-yellow-300 hover:bg-gray-700'
            }`}
            aria-label="Toggle dark mode"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className={`rounded-2xl shadow-2xl p-8 space-y-6 ${
          isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
        }`}>
          
          {/* Child Name */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${
              isDark ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Child&apos;s Name *
            </label>
            <input
              type="text"
              value={formData.childName}
              onChange={(e) => setFormData((prev) => ({ ...prev, childName: e.target.value }))}
              className={`w-full px-4 py-3 rounded-xl transition-all ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-purple-500' 
                  : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500'
              } border-2 focus:ring-2 focus:border-transparent`}
              placeholder="Enter your child's name"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${
              isDark ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Child&apos;s Photo *
            </label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className={`block w-full text-sm ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                } file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold ${
                  isDark 
                    ? 'file:bg-purple-600 file:text-white hover:file:bg-purple-500' 
                    : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
                } transition-all cursor-pointer`}
              />
              {photoPreview && (
                <Image
                  src={photoPreview}
                  alt="Preview"
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-xl object-cover border-4 border-purple-500 shadow-lg"
                />
              )}
            </div>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              We&apos;ll create a cartoon character from this photo
            </p>
          </div>

          {/* Story Theme */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${
              isDark ? 'text-gray-200' : 'text-gray-700'
            }`}>
              What should the story be about? *
            </label>
            <textarea
              value={formData.storyTheme}
              onChange={(e) => setFormData((prev) => ({ ...prev, storyTheme: e.target.value }))}
              rows={4}
              className={`w-full px-4 py-3 rounded-xl transition-all ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-purple-500' 
                  : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500'
              } border-2 focus:ring-2 focus:border-transparent`}
              placeholder="E.g., A brave adventure in the mountains, learning about friendship, a magical journey through space..."
            />
          </div>

          {/* Language Selection */}
          <div>
            <label className={`block text-sm font-semibold mb-3 ${
              isDark ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Select Languages * (Choose 1-2)
            </label>
            <div className="grid grid-cols-2 gap-4">
              {LANGUAGES.map((lang) => {
                const isSelected = formData.languages.includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageToggle(lang.code)}
                    className={`p-5 rounded-xl border-3 transition-all transform hover:scale-105 ${
                      isSelected
                        ? isDark
                          ? 'border-purple-500 bg-purple-900/40 shadow-lg shadow-purple-500/50'
                          : 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/30'
                        : isDark
                          ? 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="text-4xl mb-2">{lang.flag}</div>
                    <div className={`text-base font-bold ${
                      isSelected
                        ? isDark ? 'text-purple-300' : 'text-blue-700'
                        : isDark ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      {lang.name}
                    </div>
                  </button>
                );
              })}
            </div>
            {formData.languages.length >= 2 && (
              <p className={`text-sm mt-3 font-medium ${
                isDark ? 'text-purple-400' : 'text-blue-600'
              }`}>
                ✨ Bilingual mode: Each page will show both languages side-by-side!
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className={`px-4 py-3 rounded-xl border-2 ${
              isDark 
                ? 'bg-red-900/40 border-red-500 text-red-300' 
                : 'bg-red-50 border-red-300 text-red-700'
            }`}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isGenerating}
            className={`w-full py-4 px-6 rounded-xl font-bold text-lg text-white transition-all transform hover:scale-[1.02] ${
              isGenerating
                ? 'bg-gray-400 cursor-not-allowed'
                : isDark
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-xl shadow-purple-500/50'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-xl'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-3">
                <span className="animate-spin">⏳</span>
                Creating Your Storybook...
              </span>
            ) : (
              '📖 Create Storybook'
            )}
          </button>
        </form>

        {/* Loading State */}
        {isGenerating && (
          <div className={`mt-6 px-6 py-4 rounded-xl border-2 ${
            isDark 
              ? 'bg-purple-900/30 border-purple-500 text-purple-200' 
              : 'bg-blue-50 border-blue-300 text-blue-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${
                isDark ? 'border-purple-400' : 'border-blue-700'
              }`}></div>
              <div>
                <p className="font-bold">Creating magic... ✨</p>
                <p className="text-sm opacity-80">This may take 1-2 minutes. Please don&apos;t close this page.</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={`text-center mt-8 text-sm ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <p>Built with ❤️ for Kurdish children worldwide 🕊️</p>
          <p className="mt-2 text-xs opacity-60">Version 1.2.1 • 2026-02-14 ✨ (Puppeteer)</p>
        </div>
      </div>
    </div>
  );
}
