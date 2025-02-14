// Inicialización del canvas de Fabric.js
let canvas = new fabric.Canvas('c');
let imageLoader = document.getElementById('imageLoader');
let addClassBtn = document.getElementById('addClassBtn');
let classesUl = document.getElementById('classesUl');
let saveBtn = document.getElementById('saveBtn');

let classes = []; // Array de objetos: {id, name, color}
let currentClass = null;
let rect, isDown, origX, origY;

// Función para añadir clases por defecto
function addDefaultClasses() {
  addClass('persona', '#FF0000');
  addClass('vehiculo', '#00FF00');
}
function addClass(name, color) {
  let classId = classes.length; // Se asigna el id de forma secuencial
  classes.push({id: classId, name: name, color: color});
  let li = document.createElement('li');
  li.textContent = name;
  li.style.cursor = 'pointer';
  li.style.color = color;
  li.dataset.classId = classId;
  li.addEventListener('click', function() {
    currentClass = classes.find(c => c.id == this.dataset.classId);
    // Se resalta la clase seleccionada
    let lis = classesUl.getElementsByTagName('li');
    for (let item of lis) {
      item.style.fontWeight = 'normal';
    }
    this.style.fontWeight = 'bold';
  });
  classesUl.appendChild(li);
  // Si no hay clase seleccionada, se establece la primera por defecto
  if (currentClass === null) {
    currentClass = classes[0];
    li.style.fontWeight = 'bold';
  }
}

addDefaultClasses();

// Botón para añadir una nueva clase
addClassBtn.addEventListener('click', function() {
  let name = prompt("Introduce el nombre de la nueva clase:");
  if (name) {
    // Se genera un color aleatorio
    let color = '#' + Math.floor(Math.random()*16777215).toString(16);
    addClass(name, color);
  }
});

// Cargar imagen desde el input y establecerla como fondo del canvas
imageLoader.addEventListener('change', function(e) {
  let file = e.target.files[0];
  if (!file) return;
  let reader = new FileReader();
  reader.onload = function(f) {
    let data = f.target.result;
    fabric.Image.fromURL(data, function(img) {
      canvas.clear();
      // Ajusta la imagen al tamaño del canvas
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
        scaleX: canvas.width / img.width,
        scaleY: canvas.height / img.height
      });
    });
  };
  reader.readAsDataURL(file);
  // Se almacena el nombre de la imagen para guardar el fichero de etiquetas
  canvas.imageFilename = file.name;
});

// Eventos para dibujar bounding boxes de forma interactiva
canvas.on('mouse:down', function(o) {
  if (!currentClass) {
    alert("Selecciona una clase primero.");
    return;
  }
  isDown = true;
  let pointer = canvas.getPointer(o.e);
  origX = pointer.x;
  origY = pointer.y;
  rect = new fabric.Rect({
    left: origX,
    top: origY,
    width: 0,
    height: 0,
    fill: 'rgba(0,0,0,0)', // Fondo transparente
    stroke: currentClass.color,
    strokeWidth: 2,
    selectable: true,
    hasRotatingPoint: false,
    // Se asigna el id de la clase
    classId: currentClass.id
  });
  canvas.add(rect);
});

canvas.on('mouse:move', function(o) {
  if (!isDown) return;
  let pointer = canvas.getPointer(o.e);
  if (origX > pointer.x){
      rect.set({ left: pointer.x });
  }
  if (origY > pointer.y){
      rect.set({ top: pointer.y });
  }
  rect.set({ width: Math.abs(origX - pointer.x) });
  rect.set({ height: Math.abs(origY - pointer.y) });
  canvas.renderAll();
});

canvas.on('mouse:up', function(o) {
  isDown = false;
  rect.setCoords();
});

// Botón para guardar las etiquetas en formato YOLO
saveBtn.addEventListener('click', function() {
  if (!canvas.backgroundImage) {
    alert("Carga una imagen primero.");
    return;
  }
  let labels = [];
  // Se recorren los objetos (bounding boxes) del canvas
  canvas.getObjects('rect').forEach(function(obj) {
    // Se obtienen las dimensiones de la imagen mostrada en el canvas
    let img = canvas.backgroundImage;
    let imgWidth = img.width * img.scaleX;
    let imgHeight = img.height * img.scaleY;
    let x = obj.left;
    let y = obj.top;
    // Se tienen en cuenta escalados (si se han aplicado modificaciones manuales a la caja, estos se multiplican por scaleX/scaleY)
    let w = obj.width * (obj.scaleX || 1);
    let h = obj.height * (obj.scaleY || 1);
    // Se calcula la posición central y el tamaño normalizado respecto al canvas (aquí se asume que la imagen ocupa todo el canvas)
    let x_center = (x + w / 2) / canvas.width;
    let y_center = (y + h / 2) / canvas.height;
    let nw = w / canvas.width;
    let nh = h / canvas.height;
    labels.push({
      class_id: obj.classId,
      x_center: x_center,
      y_center: y_center,
      width: nw,
      height: nh
    });
  });
  
  // Se envían los datos al backend mediante fetch
  fetch('/save_labels', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename: canvas.imageFilename || 'imagen.jpg',
      labels: labels
    })
  })
  .then(response => response.json())
  .then(data => {
    alert("Etiquetas guardadas en: " + data.label_file);
  })
  .catch(error => {
    console.error('Error:', error);
  });
});
