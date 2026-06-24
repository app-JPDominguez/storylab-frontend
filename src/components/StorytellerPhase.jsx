import { useState, useEffect } from 'react';
import { crearProyecto, obtenerProyecto, obtenerPreguntas, guardarRespuestas, obtenerNarrativa } from '../utils/api';

export default function StorytellerPhase() {
  const [nombre, setNombre] = useState('');
  const [ideaInicial, setIdeaInicial] = useState('');
  const [loading, setLoading] = useState(false);
  const [proyectoId, setProyectoId] = useState(null);
  const [proyecto, setProyecto] = useState(null);
  const [error, setError] = useState(null);

  // Fase: preguntas
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [guardandoRespuestas, setGuardandoRespuestas] = useState(false);

  // Fase: narrativa
  const [narrativa, setNarrativa] = useState(null);
  const [estadoNarrativa, setEstadoNarrativa] = useState(null);
  const [polleando, setPolleando] = useState(false);

  // Crear proyecto
  const handleCrearProyecto = async (e) => {
    e.preventDefault();
    setError(null);

    if (!nombre || !ideaInicial) {
      setError('Completá todos los campos');
      return;
    }

    setLoading(true);
    try {
      const res = await crearProyecto(nombre, ideaInicial);
      if (res.ok) {
        setProyectoId(res.proyecto_id);
        const proyectoData = await obtenerProyecto(res.proyecto_id);
        setProyecto(proyectoData);
        
        // Esperar a que n8n genere las preguntas (con reintentos)
let preguntasData = [];
let intentos = 0;
while (preguntasData.length === 0 && intentos < 10) {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 seg
  preguntasData = await obtenerPreguntas(res.proyecto_id);
  intentos++;
}
setPreguntas(preguntasData);
        
        setNombre('');
        setIdeaInicial('');
      } else {
        setError(res.error || 'Error al crear proyecto');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Guardar respuestas
  const handleGuardarRespuestas = async () => {
    setError(null);

    // Validar que todas las preguntas tengan respuesta
    const todasRespondidas = preguntas.every((_, i) => respuestas[i]?.trim());
    if (!todasRespondidas) {
      setError('Respondé todas las preguntas');
      return;
    }

    setGuardandoRespuestas(true);
    try {
      const res = await guardarRespuestas(proyectoId, respuestas);
      if (res.ok) {
        // Iniciar polling para obtener la narrativa
        setPolleando(true);
        pollNarrativa(proyectoId);
      } else {
        setError(res.error || 'Error al guardar respuestas');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setGuardandoRespuestas(false);
    }
  };

  // Poll para obtener narrativa (cada 2 segundos)
  const pollNarrativa = async (id) => {
    const maxAttempts = 60; // 2 minutos máximo
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const { narrativa: narr, estado } = await obtenerNarrativa(id);
        setEstadoNarrativa(estado);

        if (narr && narr.trim()) {
          setNarrativa(narr);
          clearInterval(interval);
          setPolleando(false);
        } else if (attempts >= maxAttempts) {
          setError('Tiempo de espera agotado. Intentá de nuevo.');
          clearInterval(interval);
          setPolleando(false);
        }
      } catch (err) {
        console.error('Error polleando narrativa:', err);
      }
    }, 2000);
  };

  // Vista 1: Formulario inicial
  if (!proyectoId) {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ marginBottom: '10px', fontSize: '32px', fontWeight: '900' }}>📖 StoryLAB</h1>
        <p style={{ color: '#666', marginBottom: '30px', fontSize: '14px' }}>Generador de historias con IA</p>

        <form onSubmit={handleCrearProyecto} style={{
          background: '#fff',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' }}>
              Nombre del proyecto
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Anuncio Malbec"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' }}>
              Idea inicial
            </label>
            <textarea
              value={ideaInicial}
              onChange={(e) => setIdeaInicial(e.target.value)}
              placeholder="Describe tu idea, emoción, público objetivo..."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: 'inherit',
                minHeight: '120px',
                resize: 'vertical',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: loading ? '#ccc' : '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            {loading ? '⏳ Creando...' : '✨ Crear Proyecto'}
          </button>
        </form>
      </div>
    );
  }

  // Vista 2: Responder preguntas
  if (!narrativa) {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px' }}>
        <button
          onClick={() => {
            setProyectoId(null);
            setProyecto(null);
            setPreguntas([]);
            setRespuestas({});
            setNarrativa(null);
            setEstadoNarrativa(null);
            setPolleando(false);
            setError(null);
          }}
          style={{
            marginBottom: '20px',
            padding: '8px 16px',
            background: '#f0f0f0',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          ← Volver
        </button>

        <h1 style={{ marginBottom: '8px', fontSize: '28px', fontWeight: '900' }}>
          {proyecto?.nombre}
        </h1>
        <p style={{ color: '#666', marginBottom: '30px', fontSize: '14px' }}>
          {polleando ? '⏳ Generando narrativa...' : 'Respondé estas preguntas'}
        </p>

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '20px',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {preguntas.map((pregunta, i) => (
            <div key={i} style={{
              background: '#fff',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#333',
              }}>
                <span style={{ color: '#6366f1', fontWeight: '700' }}>Q{i + 1}.</span> {pregunta}
              </label>
              <textarea
                value={respuestas[i] || ''}
                onChange={(e) => setRespuestas({ ...respuestas, [i]: e.target.value })}
                placeholder="Tu respuesta..."
                disabled={polleando}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  minHeight: '100px',
                  resize: 'vertical',
                  opacity: polleando ? 0.6 : 1,
                }}
              />
            </div>
          ))}

          <button
            onClick={handleGuardarRespuestas}
            disabled={guardandoRespuestas || polleando}
            style={{
              padding: '12px 24px',
              background: (guardandoRespuestas || polleando) ? '#ccc' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: (guardandoRespuestas || polleando) ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              marginTop: '20px',
            }}
          >
            {guardandoRespuestas ? '💾 Guardando...' : polleando ? '✨ Generando narrativa...' : '📤 Guardar Respuestas'}
          </button>
        </div>
      </div>
    );
  }

  // Vista 3: Narrativa generada
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <button
        onClick={() => {
          setProyectoId(null);
          setProyecto(null);
          setPreguntas([]);
          setRespuestas({});
          setNarrativa(null);
          setEstadoNarrativa(null);
          setPolleando(false);
          setError(null);
        }}
        style={{
          marginBottom: '20px',
          padding: '8px 16px',
          background: '#f0f0f0',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600',
        }}
      >
        ← Crear nuevo proyecto
      </button>

      <div style={{
        background: '#ecfdf5',
        border: '2px solid #10b981',
        padding: '30px',
        borderRadius: '12px',
      }}>
        <h2 style={{ color: '#059669', marginBottom: '20px', fontSize: '28px', fontWeight: '700' }}>
          ✨ Narrativa Generada
        </h2>

        <div style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '10px',
          border: '1px solid #d1fae5',
          marginBottom: '20px',
          lineHeight: '1.8',
          fontSize: '15px',
          color: '#1f2937',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {narrativa}
        </div>

        <div style={{
          background: '#f0fdf4',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #d1fae5',
          fontSize: '13px',
          color: '#065f46',
        }}>
          <span style={{ fontWeight: '600' }}>📊 Estado:</span> {estadoNarrativa}
        </div>
      </div>
    </div>
  );
}