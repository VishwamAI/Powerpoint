import sys
import json
from transformers import pipeline

# Load the NLP model for text generation
generator = pipeline('text-generation', model='distilbert/distilgpt2')

def generate_slide_content(prompt):
    """
    Generate slide content based on the given prompt.
    
    Args:
    prompt (str): The input prompt for generating slide content.
    
    Returns:
    str: The generated slide content.
    """
    result = generator(prompt, max_length=150, num_return_sequences=1, truncation=True)
    return result[0]['generated_text']

if __name__ == "__main__":
    # Read the input prompt from the command line arguments
    input_prompt = sys.argv[1]
    
    # Generate the slide content
    generated_content = generate_slide_content(input_prompt)
    
    # Output the generated content as JSON
    output = {
        "prompt": input_prompt,
        "generated_content": generated_content
    }
    print(json.dumps(output))
