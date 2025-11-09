# Pollinations AI Extension

Generate images, text, and audio using [Pollinations.AI](https://pollinations.ai) - the world's most accessible open GenAI platform.

**✨ Fully functional implementation with real API integration**

## Features

- **Generate Text**: Generate text responses using OpenAI or Mistral models
- **Generate Image**: Create images from text prompts using Flux or Turbo models
- **Generate Audio**: Convert text to speech with various voice options

## Usage

### Generate Text
1. Run the "Generate Text" command
2. Select your preferred AI model from the dropdown (OpenAI or Mistral)
3. Enter your text prompt in the search bar
4. Press Enter or click "Generate Text" to create AI-generated text
5. View the generated text in the detail panel on the right
6. Copy the generated response
7. Access previous generations from the History section

### Generate Image
1. Run the "Generate Image" command
2. Select your preferred AI model from the dropdown (Flux or Turbo)
3. Enter your image prompt in the search bar
4. Press Enter or click "Generate Image" to create an AI-generated image
5. View the image preview in the detail panel on the right
6. Copy the image URL or open it in your browser
7. Access previous generations from the History section

### Generate Audio
1. Run the "Generate Audio" command
2. Select your preferred voice from the dropdown (Alloy, Echo, Fable, Onyx, Nova, Shimmer)
3. Enter text to convert to speech in the search bar
4. Press Enter or click "Generate Audio" to create AI-generated audio
5. View the audio play link in the detail panel on the right
6. Copy the audio URL or open it in your browser
7. Access previous generations from the History section

## Features

- **Detail Panels**: View generated content directly in clean detail panels
- **Model Selection**: Choose from multiple AI models for each generation type
- **Keyboard Shortcuts**: Press Enter to generate content quickly
- **Generation History**: View and access previous generations
- **Persistent Storage**: History saved across sessions (last 50 items)
- **Real-time Generation**: Live API integration with loading states
- **Copy & Open Actions**: Easy access to generated content

## API Integration

This extension makes real HTTP requests to the Pollinations.AI API:
- **Text Generation**: Fetches AI-generated text responses
- **Image Generation**: Generates image URLs that return image data
- **Audio Generation**: Generates audio URLs that return audio data

All requests are made directly to Pollinations.AI servers with no authentication required for basic usage.

## Configuration

You can customize the default settings in the extension preferences:

- **Default Text Model**: Choose between OpenAI and Mistral
- **Default Image Model**: Choose between Flux and Turbo
- **Default Voice**: Select from various voice options (Alloy, Echo, Fable, Onyx, Nova, Shimmer)

## API Information

This extension uses the Pollinations.AI API which provides:

- No signup required for basic usage
- Rate limits: 1 request every 15 seconds for anonymous users
- Higher limits available with registration at [auth.pollinations.ai](https://auth.pollinations.ai)

## Models Available

### Image Models
- **Flux**: High-quality image generation
- **Turbo**: Fast image generation

### Text Models
- **OpenAI**: General-purpose text generation
- **Mistral**: Alternative text generation model

### Audio Voices
- **Alloy**: Neutral, professional
- **Echo**: Deep, resonant
- **Fable**: Storyteller vibe
- **Onyx**: Warm, rich
- **Nova**: Bright, friendly
- **Shimmer**: Soft, melodic

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build for production
bun run build
```

## License

MIT