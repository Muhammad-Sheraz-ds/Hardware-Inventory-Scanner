import streamlit as st
from groq import Groq
import base64
import json
from PIL import Image
import io
import time

# --- Page Config ---
st.set_page_config(
    page_title="Hardware Inventory Scanner",
    page_icon="🖥️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# --- Custom CSS for better UI ---
st.markdown("""
<style>
    /* Main container styling */
    .main > div {
        padding-top: 2rem;
    }
    
    /* Header styling */
    .header-container {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 2rem;
        border-radius: 15px;
        margin-bottom: 2rem;
        text-align: center;
        color: white;
    }
    
    .header-title {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
    }
    
    .header-subtitle {
        font-size: 1.1rem;
        opacity: 0.9;
    }
    
    /* Card styling */
    .upload-card {
        background: #f8f9fa;
        border-radius: 15px;
        padding: 2rem;
        border: 2px dashed #dee2e6;
        text-align: center;
    }
    
    .result-card {
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        border-radius: 15px;
        padding: 1.5rem;
        margin-top: 1rem;
    }
    
    /* Button styling */
    .stButton > button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.75rem 2rem;
        font-size: 1.1rem;
        font-weight: 600;
        border-radius: 10px;
        width: 100%;
        transition: transform 0.2s;
    }
    
    .stButton > button:hover {
        transform: scale(1.02);
    }
    
    /* Image container */
    .image-container {
        border-radius: 15px;
        overflow: hidden;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    
    /* Result metrics */
    .metric-box {
        background: white;
        padding: 1rem;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        margin-bottom: 0.5rem;
    }
    
    .metric-label {
        font-size: 0.8rem;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    
    .metric-value {
        font-size: 1.3rem;
        font-weight: 700;
        color: #333;
    }
    
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

# --- API Key ---
# For local development: create .streamlit/secrets.toml with GROQ_API_KEY = "your_key"
# For Streamlit Cloud: add secret in app settings
import os
try:
    GROQ_API_KEY = st.secrets["GROQ_API_KEY"]
except:
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# --- Backend Logic ---
def process_vision_data(image_file):
    """Function to process image and extract JSON data"""
    client = Groq(api_key=GROQ_API_KEY)
    
    # Convert image to Base64
    base64_image = base64.b64encode(image_file.getvalue()).decode('utf-8')

    # Prompt for vision model
    prompt = """
    Extract the following information from this hardware label in JSON format:
    - form_factor (Laptop or Desktop)
    - capacity (e.g., 8GB, 16GB, 256GB)
    - generation (DDR3, DDR4, DDR5)
    - brand
    - speed (bus speed in MHz, e.g., 2133, 2400, 2666, 3200)
    If any field is missing, set it to "N/A". Return ONLY the JSON object.
    """

    try:
        completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                        },
                    ],
                }
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        return {"error": str(e)}

# --- Header ---
st.markdown("""
<div class="header-container">
    <div class="header-title">🖥️ Hardware Inventory Scanner</div>
    <div class="header-subtitle">AI-powered extraction for RAM, SSD & Storage devices</div>
</div>
""", unsafe_allow_html=True)

# --- Main Content ---
col1, col2 = st.columns([1, 1], gap="large")

with col1:
    st.markdown("### 📸 Upload Image")
    uploaded_file = st.file_uploader(
        "Drop your hardware label image here",
        type=["jpg", "jpeg", "png"],
        help="Supported formats: JPG, JPEG, PNG"
    )
    
    if uploaded_file:
        st.markdown("---")
        st.markdown("### 🖼️ Preview")
        st.image(uploaded_file, caption="Uploaded Hardware Label", use_column_width=True)
        
        # File info
        file_size = len(uploaded_file.getvalue()) / 1024
        st.caption(f"📁 {uploaded_file.name} • {file_size:.1f} KB")

with col2:
    st.markdown("### 📊 Extracted Data")
    
    if uploaded_file:
        if st.button("🔍 Extract Information", use_container_width=True):
            with st.spinner("🤖 AI is analyzing the image..."):
                start_time = time.time()
                extracted_data = process_vision_data(uploaded_file)
                processing_time = time.time() - start_time
            
            if "error" in extracted_data:
                st.error(f"❌ Error: {extracted_data['error']}")
            else:
                st.success(f"✅ Extracted in {processing_time:.2f} seconds")
                
                # Display results in a nice grid
                st.markdown("---")
                
                # Row 1: Form Factor & Brand
                r1c1, r1c2 = st.columns(2)
                with r1c1:
                    st.markdown(f"""
                    <div class="metric-box">
                        <div class="metric-label">Form Factor</div>
                        <div class="metric-value">{extracted_data.get('form_factor', 'N/A')}</div>
                    </div>
                    """, unsafe_allow_html=True)
                with r1c2:
                    st.markdown(f"""
                    <div class="metric-box">
                        <div class="metric-label">Brand</div>
                        <div class="metric-value">{extracted_data.get('brand', 'N/A')}</div>
                    </div>
                    """, unsafe_allow_html=True)
                
                # Row 2: Capacity & Generation
                r2c1, r2c2 = st.columns(2)
                with r2c1:
                    st.markdown(f"""
                    <div class="metric-box">
                        <div class="metric-label">Capacity</div>
                        <div class="metric-value">{extracted_data.get('capacity', 'N/A')}</div>
                    </div>
                    """, unsafe_allow_html=True)
                with r2c2:
                    st.markdown(f"""
                    <div class="metric-box">
                        <div class="metric-label">Generation</div>
                        <div class="metric-value">{extracted_data.get('generation', 'N/A')}</div>
                    </div>
                    """, unsafe_allow_html=True)
                
                # Row 3: Speed
                st.markdown(f"""
                <div class="metric-box">
                    <div class="metric-label">Bus Speed</div>
                    <div class="metric-value">{extracted_data.get('speed', 'N/A')} MHz</div>
                </div>
                """, unsafe_allow_html=True)
                
                # JSON output (collapsible)
                with st.expander("📋 View Raw JSON"):
                    st.json(extracted_data)
    else:
        st.info("👈 Upload an image to get started")
        st.markdown("""
        **Supported Hardware:**
        - 💾 RAM (DDR3, DDR4, DDR5)
        - 💿 SSD & M.2 Drives
        - 🗃️ Hard Drives
        """)

# --- Footer ---
st.markdown("---")
st.markdown(
    "<div style='text-align: center; color: #6c757d; font-size: 0.9rem;'>"
    "Powered by Groq AI • Built with Streamlit"
    "</div>",
    unsafe_allow_html=True
)