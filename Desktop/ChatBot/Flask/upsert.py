import os
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from huggingface_hub import InferenceClient
from pinecone import Pinecone
from tqdm import tqdm
# import time
import time
from huggingface_hub.errors import HfHubHTTPError

# --- Setup ---
# PINECONE_API_KEY=
#GROQ_API_KEY=


#HF_TOKEN=
HF_TOKEN = ""
PINECONE_KEY = ""
INDEX_NAME = "web-scrape-index"

hf_client = InferenceClient(api_key=HF_TOKEN)
pc = Pinecone(api_key=PINECONE_KEY)
index = pc.Index(INDEX_NAME)

def process_my_pdf(file_path):
    # ... (Reading and Splitting logic stays the same) ...
    reader = PdfReader(file_path)
    full_text = ""
    for page in reader.pages:
        full_text += page.extract_text() + "\n"

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, 
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " "]
    )
    chunks = text_splitter.split_text(full_text)
    print(f"Created {len(chunks)} logical chunks. Starting patient upload...")

    # 3. Patient Upload Loop
    # Processing 1 by 1 is the safest way to avoid Gateway Timeouts
    for i, text in enumerate(tqdm(chunks)):
        success = False
        retries = 0
        
        while not success and retries < 5:
            try:
                # Get embedding for a single chunk
                embedding = hf_client.feature_extraction(text, model="BAAI/bge-m3")
                
                # Upsert to Pinecone
                index.upsert(vectors=[{
                    "id": f"pdf_chunk_{i}",
                    "values": embedding,
                    "metadata": {"text_chunk": text}
                }])
                success = True
                
            except HfHubHTTPError as e:
                retries += 1
                wait_time = retries * 10 # Wait 10s, then 20s, etc.
                print(f"\n[Attempt {retries}] Server busy, waiting {wait_time}s...")
                time.sleep(wait_time)
                
            except Exception as e:
                print(f"\n[Error] Skipping chunk {i} due to: {e}")
                break # Move to next chunk if it's a non-server error

    print("\nMigration Complete! Your 190-page document is now a 1024-dim vector brain.")

if __name__ == "__main__":
    # Just put the name of your file here
    process_my_pdf("Rag.pdf")