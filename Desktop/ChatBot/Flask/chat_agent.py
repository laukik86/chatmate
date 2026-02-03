
from langchain_groq import ChatGroq
from langchain_community.utilities import SQLDatabase
from langchain_experimental.sql import SQLDatabaseChain

# 1. Connect to DB
db = SQLDatabase.from_uri("sqlite:///college_data.db")

# 2. Setup LLM
llm = ChatGroq(
    groq_api_key="apikeyhere", 
    model_name="llama-3.3-70b-versatile",
    temperature=0 
)

# 3. System Prompt for Data Extraction
# We tell the AI to return the raw result set as a string for the next agent
system_prompt = """
You are a SQL Data Retrieval specialized for Maharashtra Admissions.
Your only job is to generate a SQL query and return the RAW result list.

DATABASE SCHEMA:
The 'cutoffs' table has columns: college_name, branch_code, category_code, closing_percentile, year.

LOGIC RULES:
1. If a user says "97.5 percentile", find branches where closing_percentile <= 97.5 (meaning the cutoff was lower than their score).
2. For "2024-25", use year = 2024.
3. Use LIKE '%VESIT%' for college names.
4. ONLY output the SQL query.

Question: {input}
SQLQuery: """

# 4. Initialize Chain with Intermediate Steps
# setting return_direct=True allows us to get the raw SQL result
db_chain = SQLDatabaseChain.from_llm(
    llm, 
    db, 
    verbose=True, 
    return_direct=True  # This skips the AI's "natural language" summary
)

# 5. Run and Prepare for Next Agent
question = "I have 97.5 percentile for what branches am i eligible in GOPENH in VESIT for 2024-25?"

# Execute the chain
raw_data = db_chain.invoke(f"{system_prompt}\n\nQuestion: {question}")

# The 'result' will now be a string representation of the database rows
# Example: "[('EXTC',), ('AURO',), ('ECS',)]"
final_data_for_agent = {
    "user_query": question,
    "database_results": raw_data["result"]
}

print(f"\n--- Data Sent to Next Agent ---\n{final_data_for_agent}")