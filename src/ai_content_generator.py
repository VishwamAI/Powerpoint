import sys
import json
from transformers import pipeline

def generate_presentation_content(prompt):
    # Initialize the Hugging Face pipeline for text generation
    generator = pipeline('text-generation', model='distilbert/distilgpt2')

    # Generate content based on the prompt
    generated_content = generator(prompt, max_length=500, num_return_sequences=1)

    # Extract the generated text
    content = generated_content[0]['generated_text']

    return content

if __name__ == "__main__":
    # Read the prompt from the command line arguments
    prompt = sys.argv[1]

    # Generate the presentation content
    content = generate_presentation_content(prompt)

    # Print the generated content as a JSON object
    print(json.dumps({"content": content}))
