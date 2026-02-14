import { NextRequest, NextResponse } from 'next/server';

interface StoryRequest {
  childName: string;
  storyTheme: string;
  languages: string[];
  characterImageUrl: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  ku: 'Kurdish (Sorani)',
  en: 'English',
  ar: 'Arabic',
  tr: 'Turkish',
};

export async function POST(request: NextRequest) {
  try {
    const { childName, storyTheme, languages, characterImageUrl }: StoryRequest =
      await request.json();

    if (!childName || !storyTheme || !languages || languages.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Build the prompt for story generation
    const languageList = languages.map((lang) => LANGUAGE_NAMES[lang] || lang).join(', ');
    
    const systemPrompt = `You are a creative children's story writer specializing in multilingual educational content. Generate age-appropriate, engaging stories for children aged 4-8 years old.`;

    const userPrompt = `Create a children's storybook with the following requirements:

- **Child's Name**: ${childName}
- **Story Theme**: ${storyTheme}
- **Languages**: ${languageList}
- **Format**: ${languages.length === 1 ? 'Single language story' : 'Bilingual/multilingual story with parallel text'}

**Instructions**:
1. Create a story of exactly 8 pages (each page should have 2-3 sentences)
2. The main character should be named "${childName}"
3. Keep the language simple and age-appropriate (4-8 years old)
4. Make it educational and meaningful
5. Include a moral or lesson
${languages.length > 1 ? `6. Provide translations for EACH page in ALL selected languages (${languageList})` : ''}

**Output Format** (JSON):
{
  "title": {${languages.map((lang) => `"${lang}": "Title in ${LANGUAGE_NAMES[lang]}"`).join(', ')}},
  "pages": [
    {
      "pageNumber": 1,
      "text": {${languages.map((lang) => `"${lang}": "Page 1 text in ${LANGUAGE_NAMES[lang]}"`).join(', ')}}
    },
    ... (8 pages total)
  ]
}

Return ONLY valid JSON, no additional text.`;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorData.substring(0, 200)}`);
    }

    const openaiData = await openaiResponse.json();
    const storyContent = JSON.parse(openaiData.choices[0].message.content);

    return NextResponse.json({
      storyContent,
      message: 'Story generated successfully',
    });
  } catch (error) {
    console.error('Story generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate story' },
      { status: 500 }
    );
  }
}
