const API_URL = process.env.VITE_API_URL || 'http://localhost:5000/api';

export async function crearProyecto(nombre, idea_inicial) {
  const res = await fetch(`${API_URL}/proyectos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, idea_inicial }),
  });
  return res.json();
}

export async function obtenerProyecto(id) {
  const res = await fetch(`${API_URL}/proyectos/${id}`);
  return res.json();
}

export async function listarProyectos() {
  const res = await fetch(`${API_URL}/proyectos`);
  return res.json();
}

// NEW: Obtener preguntas generadas por n8n
export async function obtenerPreguntas(proyectoId) {
  const res = await fetch(`${API_URL}/storytelling/${proyectoId}`);
  const data = await res.json();
  return data?.preguntas_iniciales || [];
}

// NEW: Guardar respuestas del usuario
export async function guardarRespuestas(proyectoId, respuestas) {
  const res = await fetch(`${API_URL}/storytelling/${proyectoId}/respuestas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ respuestas }),
  });
  return res.json();
}

// NEW: Obtener narrativa generada
export async function obtenerNarrativa(proyectoId) {
  const res = await fetch(`${API_URL}/storytelling/${proyectoId}`);
  const data = await res.json();
  return {
    narrativa: data?.storytelling_generado || null,
    estado: data?.estado || null,
  };
}