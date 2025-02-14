from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
LABELS_FOLDER = 'labels'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(LABELS_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

# Endpoint para subir imagen (si se desea almacenar las imágenes)
@app.route('/upload_image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No se ha enviado ninguna imagen'}), 400
    image = request.files['image']
    path = os.path.join(UPLOAD_FOLDER, image.filename)
    image.save(path)
    return jsonify({'filename': image.filename})

# Endpoint para guardar las etiquetas en formato YOLO
@app.route('/save_labels', methods=['POST'])
def save_labels():
    data = request.get_json()
    filename = data.get('filename', 'imagen.jpg')
    labels = data.get('labels', [])
    yolo_lines = []
    for label in labels:
        # Cada línea: class_id x_center y_center width height (todos normalizados)
        class_id = label.get('class_id')
        x_center = label.get('x_center')
        y_center = label.get('y_center')
        width = label.get('width')
        height = label.get('height')
        yolo_lines.append(f"{class_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}")
    
    # El fichero de etiquetas tendrá el mismo nombre base que la imagen pero con extensión .txt
    label_file = os.path.splitext(filename)[0] + '.txt'
    path = os.path.join(LABELS_FOLDER, label_file)
    with open(path, 'w') as f:
        f.write("\n".join(yolo_lines))
    return jsonify({'message': 'Etiquetas guardadas', 'label_file': label_file})

if __name__ == '__main__':
    app.run(debug=True)