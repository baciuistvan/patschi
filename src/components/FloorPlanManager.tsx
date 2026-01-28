import { useState, useEffect } from 'react';
import { supabase, Room, Table } from '../lib/supabase';
import { Plus, CreditCard as Edit2, Trash2, Square, Circle, SquareDashedBottom, Printer, Pen, Eraser, MousePointer2, RotateCw, Type, Lock, Unlock, ArrowUpDown, ArrowLeftRight, Maximize2, Copy, ChevronsLeft, ChevronsRight, ChevronsUp, ChevronsDown, Minimize2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface Reservation {
  id: string;
  customer_name: string;
  reservation_date: string;
  reservation_time: string;
  table_assignments?: Array<{ table_id: string }>;
}

interface TableStatus {
  isBooked: boolean;
  guestName?: string;
  reservationTime?: string;
}

export function FloorPlanManager() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [groupDragStart, setGroupDragStart] = useState<{ x: number; y: number; tablePositions: Map<string, { x: number; y: number }> } | null>(null);
  const [showAddTable, setShowAddTable] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'none' | 'freehand' | 'rectangle' | 'circle' | 'halfcircle' | 'rotate' | 'decoration' | 'decoration-rect' | 'decoration-halfcircle' | 'decoration-text' | 'select'>('none');
  const [paths, setPaths] = useState<Array<{ points: number[], color: string, width: number }>>([]);
  const [currentPath, setCurrentPath] = useState<number[]>([]);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [resizingTable, setResizingTable] = useState<{ id: string; edge: string; startX: number; startY: number; startWidth: number; startHeight: number; startPosX: number; startPosY: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; table: Table } | null>(null);
  const [decorations, setDecorations] = useState<Array<{ id: string; x: number; y: number; width: number; height: number; shape: 'circle' | 'rectangle' | 'halfcircle' | 'text'; text?: string; rotation?: number }>>([]);
  const [resizingDecoration, setResizingDecoration] = useState<{ id: string; edge: string; startX: number; startY: number; startWidth: number; startHeight: number; startPosX: number; startPosY: number } | null>(null);
  const [draggingDecoration, setDraggingDecoration] = useState<{ id: string; startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const [tableStatuses, setTableStatuses] = useState<Map<string, TableStatus>>(new Map());

  useEffect(() => {
    loadRooms();
    if (!isAdmin) {
      loadTodayReservations();
      const interval = setInterval(loadTodayReservations, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedRoom) {
      loadTables(selectedRoom);
    }
  }, [selectedRoom]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTables(new Set());
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAllTables();
      } else if (e.key === 'Delete' && selectedTables.size > 0) {
        bulkDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTables, tables]);

  useEffect(() => {
    setSelectedTables(new Set());
  }, [selectedRoom]);

  const loadRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('name');

    if (!error && data) {
      setRooms(data);
      if (data.length > 0 && !selectedRoom) {
        setSelectedRoom(data[0].id);
      }
    }
  };

  const loadTables = async (roomId: string) => {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('room_id', roomId)
      .order('table_number');

    if (!error && data) {
      setTables(data);
    }
  };

  const loadTodayReservations = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id,
        customer_name,
        reservation_date,
        reservation_time,
        reservation_tables!inner(table_id)
      `)
      .eq('reservation_date', dateString)
      .eq('status', 'confirmed');

    if (!error && data) {
      const statusMap = new Map<string, TableStatus>();

      data.forEach((reservation: any) => {
        const tables = reservation.reservation_tables || [];
        tables.forEach((rt: any) => {
          if (rt.table_id) {
            statusMap.set(rt.table_id, {
              isBooked: true,
              guestName: reservation.customer_name,
              reservationTime: reservation.reservation_time,
            });
          }
        });
      });

      setTableStatuses(statusMap);
    }
  };

  const handleDragStart = (e: React.DragEvent, tableId: string) => {
    if (resizingTable) {
      e.preventDefault();
      return;
    }

    const table = tables.find(t => t.id === tableId);
    if (table) {
      const rotation = (table.rotation || 0) * Math.PI / 180;
      const cos = Math.abs(Math.cos(rotation));
      const sin = Math.abs(Math.sin(rotation));
      const rotatedWidth = table.width * cos + table.height * sin;
      const rotatedHeight = table.width * sin + table.height * cos;

      const canvas = document.createElement('canvas');
      canvas.width = rotatedWidth;
      canvas.height = rotatedHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
        ctx.rotate(rotation);
        ctx.translate(-table.width / 2, -table.height / 2);

        if (table.shape === 'circle') {
          ctx.fillStyle = 'rgba(37, 99, 235, 0.8)';
          ctx.strokeStyle = '#1e40af';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(table.width / 2, table.height / 2, table.width / 2, table.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (table.shape === 'halfcircle') {
          ctx.fillStyle = 'rgba(37, 99, 235, 0.8)';
          ctx.strokeStyle = '#1e40af';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(table.width / 2, table.height / 2, table.width / 2, table.height / 2, 0, 0, Math.PI);
          ctx.lineTo(table.width, table.height);
          ctx.ellipse(table.width / 2, table.height, table.width / 2, table.height / 2, 0, Math.PI, 0, true);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(37, 99, 235, 0.8)';
          ctx.strokeStyle = '#1e40af';
          ctx.lineWidth = 2;
          ctx.fillRect(0, 0, table.width, table.height);
          ctx.strokeRect(0, 0, table.width, table.height);
        }

        ctx.resetTransform();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(table.custom_label || table.table_number, rotatedWidth / 2, rotatedHeight / 2);
      }

      e.dataTransfer.setDragImage(canvas, rotatedWidth / 2, rotatedHeight / 2);
    }

    setDraggedTable(tableId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedTable) {
      const table = tables.find(t => t.id === draggedTable);
      if (table) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - table.width / 2;
        const y = e.clientY - rect.top - table.height / 2;
        setDragPreview({ x, y, table });
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTable) return;

    const table = tables.find(t => t.id === draggedTable);
    if (!table) return;

    const rect = e.currentTarget.getBoundingClientRect();

    // Simply use the cursor position minus half the table dimensions
    // The browser will handle the bounds naturally
    const x = e.clientX - rect.left - table.width / 2;
    const y = e.clientY - rect.top - table.height / 2;

    const { error } = await supabase
      .from('tables')
      .update({ position_x: Math.round(x), position_y: Math.round(y) })
      .eq('id', draggedTable);

    if (!error && selectedRoom) {
      loadTables(selectedRoom);
    }

    setDraggedTable(null);
    setDragPreview(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (drawMode === 'none') return;
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawMode === 'freehand') {
      setCurrentPath([x, y]);
    } else {
      setDrawStart({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (resizingTable) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const deltaX = x - resizingTable.startX;
      const deltaY = y - resizingTable.startY;

      const table = tables.find(t => t.id === resizingTable.id);
      if (!table) return;

      let newWidth = resizingTable.startWidth;
      let newHeight = resizingTable.startHeight;
      let newPosX = resizingTable.startPosX;
      let newPosY = resizingTable.startPosY;

      if (resizingTable.edge.includes('e')) {
        newWidth = Math.max(50, resizingTable.startWidth + deltaX);
      }
      if (resizingTable.edge.includes('w')) {
        newWidth = Math.max(50, resizingTable.startWidth - deltaX);
        newPosX = resizingTable.startPosX + (resizingTable.startWidth - newWidth);
      }
      if (resizingTable.edge.includes('s')) {
        newHeight = Math.max(50, resizingTable.startHeight + deltaY);
      }
      if (resizingTable.edge.includes('n')) {
        newHeight = Math.max(50, resizingTable.startHeight - deltaY);
        newPosY = resizingTable.startPosY + (resizingTable.startHeight - newHeight);
      }

      setTables(tables.map(t =>
        t.id === resizingTable.id
          ? { ...t, width: Math.round(newWidth), height: Math.round(newHeight), position_x: Math.round(newPosX), position_y: Math.round(newPosY) }
          : t
      ));
      return;
    }

    if (draggingDecoration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const deltaX = x - draggingDecoration.startX;
      const deltaY = y - draggingDecoration.startY;

      setDecorations(decorations.map(d =>
        d.id === draggingDecoration.id
          ? { ...d, x: Math.round(draggingDecoration.startPosX + deltaX), y: Math.round(draggingDecoration.startPosY + deltaY) }
          : d
      ));
      return;
    }

    if (resizingDecoration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const deltaX = x - resizingDecoration.startX;
      const deltaY = y - resizingDecoration.startY;

      const decoration = decorations.find(d => d.id === resizingDecoration.id);
      if (!decoration) return;

      let newWidth = resizingDecoration.startWidth;
      let newHeight = resizingDecoration.startHeight;
      let newPosX = resizingDecoration.startPosX;
      let newPosY = resizingDecoration.startPosY;

      if (resizingDecoration.edge.includes('e')) {
        newWidth = Math.max(30, resizingDecoration.startWidth + deltaX);
      }
      if (resizingDecoration.edge.includes('w')) {
        newWidth = Math.max(30, resizingDecoration.startWidth - deltaX);
        newPosX = resizingDecoration.startPosX + (resizingDecoration.startWidth - newWidth);
      }
      if (resizingDecoration.edge.includes('s')) {
        newHeight = Math.max(30, resizingDecoration.startHeight + deltaY);
      }
      if (resizingDecoration.edge.includes('n')) {
        newHeight = Math.max(30, resizingDecoration.startHeight - deltaY);
        newPosY = resizingDecoration.startPosY + (resizingDecoration.startHeight - newHeight);
      }

      setDecorations(decorations.map(d =>
        d.id === resizingDecoration.id
          ? { ...d, width: Math.round(newWidth), height: Math.round(newHeight), x: Math.round(newPosX), y: Math.round(newPosY) }
          : d
      ));
      return;
    }

    if (!isDrawing || drawMode === 'none') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawMode === 'freehand') {
      setCurrentPath([...currentPath, x, y]);
    } else if (drawStart) {
      setCurrentPath([drawStart.x, drawStart.y, x, y]);
    }
  };

  const handleMouseUp = async () => {
    if (resizingTable) {
      const table = tables.find(t => t.id === resizingTable.id);
      if (table) {
        await handleUpdateTable(table.id, {
          width: table.width,
          height: table.height,
          position_x: table.position_x,
          position_y: table.position_y,
        });
      }
      setResizingTable(null);
      return;
    }

    if (draggingDecoration) {
      setDraggingDecoration(null);
      return;
    }

    if (resizingDecoration) {
      setResizingDecoration(null);
      return;
    }

    if (!isDrawing || drawMode === 'none') return;
    setIsDrawing(false);

    if (drawMode === 'freehand' && currentPath.length > 2) {
      setPaths([...paths, { points: currentPath, color: '#3b82f6', width: 3 }]);
    } else if ((drawMode === 'rectangle' || drawMode === 'circle' || drawMode === 'halfcircle') && drawStart && currentPath.length === 4) {
      // Create a table from the drawn shape
      await createTableFromDrawing();
    } else if ((drawMode === 'decoration' || drawMode === 'decoration-rect' || drawMode === 'decoration-halfcircle' || drawMode === 'decoration-text') && drawStart && currentPath.length === 4) {
      // Create a decoration
      createDecoration();
    }

    setCurrentPath([]);
    setDrawStart(null);
  };

  const createTableFromDrawing = async () => {
    if (!selectedRoom || !drawStart || currentPath.length !== 4) return;

    const [startX, startY, endX, endY] = [drawStart.x, drawStart.y, currentPath[2], currentPath[3]];
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    const posX = Math.min(startX, endX);
    const posY = Math.min(startY, endY);

    // Find the next available table number
    const maxTableNumber = tables.reduce((max, table) => {
      const num = parseInt(table.table_number);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);

    let shape = 'rectangle';
    if (drawMode === 'circle') shape = 'circle';
    else if (drawMode === 'halfcircle') shape = 'halfcircle';

    const newTable = {
      room_id: selectedRoom,
      table_number: String(maxTableNumber + 1),
      capacity: 4,
      position_x: Math.round(posX),
      position_y: Math.round(posY),
      width: Math.round(Math.max(width, 50)),
      height: Math.round(Math.max(height, 50)),
      shape: shape,
      rotation: 0,
      is_active: true,
      is_bookable: true,
    };

    const { error } = await supabase.from('tables').insert([newTable]);

    if (!error) {
      loadTables(selectedRoom);
    }
  };

  const createDecoration = () => {
    if (!drawStart || currentPath.length !== 4) return;

    const [startX, startY, endX, endY] = [drawStart.x, drawStart.y, currentPath[2], currentPath[3]];
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);

    let shape: 'circle' | 'rectangle' | 'halfcircle' | 'text' = 'circle';
    if (drawMode === 'decoration-rect') shape = 'rectangle';
    else if (drawMode === 'decoration-halfcircle') shape = 'halfcircle';
    else if (drawMode === 'decoration-text') shape = 'text';

    const newDecoration = {
      id: `decoration-${Date.now()}`,
      x: Math.round(x),
      y: Math.round(y),
      shape,
      text: shape === 'text' ? 'Text' : undefined,
      rotation: shape === 'halfcircle' ? 0 : undefined,
      width: Math.round(Math.max(width, 30)),
      height: Math.round(Math.max(height, 30)),
    };

    setDecorations([...decorations, newDecoration]);
    setCurrentPath([]);
  };

  const clearDrawing = () => {
    setPaths([]);
    setCurrentPath([]);
  };

  const setDrawingMode = (mode: 'none' | 'freehand' | 'rectangle' | 'circle' | 'halfcircle' | 'rotate' | 'decoration') => {
    setDrawMode(mode);
    if (mode === 'none') {
      setIsDrawing(false);
      setCurrentPath([]);
      setDrawStart(null);
    }
  };

  const handleTableClick = async (table: Table) => {
    if (drawMode === 'rotate') {
      const newRotation = (table.rotation + 45) % 360;
      await handleUpdateTable(table.id, { rotation: newRotation });
    }
  };

  const toggleTableBookable = async (e: React.MouseEvent, tableId: string, currentStatus: boolean) => {
    e.stopPropagation();
    await handleUpdateTable(tableId, { is_bookable: !currentStatus });
  };

  const handleResizeStart = (e: React.MouseEvent, table: Table, edge: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).closest('.floor-plan-canvas')?.getBoundingClientRect();
    if (!rect) return;

    setResizingTable({
      id: table.id,
      edge,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      startWidth: table.width,
      startHeight: table.height,
      startPosX: table.position_x,
      startPosY: table.position_y,
    });
  };

  const handleDecorationResizeStart = (e: React.MouseEvent, decoration: { id: string; x: number; y: number; width: number; height: number }, edge: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).closest('.floor-plan-canvas')?.getBoundingClientRect();
    if (!rect) return;

    setResizingDecoration({
      id: decoration.id,
      edge,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      startWidth: decoration.width,
      startHeight: decoration.height,
      startPosX: decoration.x,
      startPosY: decoration.y,
    });
  };

  const handleDecorationDragStart = (e: React.MouseEvent, decoration: { id: string; x: number; y: number; width: number; height: number }) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).closest('.floor-plan-canvas')?.getBoundingClientRect();
    if (!rect) return;

    setDraggingDecoration({
      id: decoration.id,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      startPosX: decoration.x,
      startPosY: decoration.y,
    });
  };

  const handleAddTable = async (tableData: Partial<Table>) => {
    const roomId = tableData.room_id || selectedRoom;
    if (!roomId) return;

    // Add default position if not provided
    const tableWithDefaults = {
      ...tableData,
      room_id: roomId,
      position_x: tableData.position_x ?? 100,
      position_y: tableData.position_y ?? 100,
      is_bookable: tableData.is_bookable ?? true,
    };

    const { error } = await supabase
      .from('tables')
      .insert([tableWithDefaults]);

    if (!error) {
      // Reload the room where the table was added
      if (roomId === selectedRoom) {
        loadTables(selectedRoom);
      }
      setShowAddTable(false);
    }
  };

  const handleUpdateTable = async (tableId: string, updates: Partial<Table>) => {
    const { error } = await supabase
      .from('tables')
      .update(updates)
      .eq('id', tableId);

    if (!error && selectedRoom) {
      loadTables(selectedRoom);
      setEditingTable(null);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Are you sure you want to delete this table?')) return;

    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', tableId);

    if (!error && selectedRoom) {
      loadTables(selectedRoom);
    }
  };

  const handleTableSelection = (tableId: string, e: React.MouseEvent) => {
    if (drawMode !== 'none' && drawMode !== 'select') return;

    e.stopPropagation();

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      setSelectedTables(prev => {
        const newSet = new Set(prev);
        if (newSet.has(tableId)) {
          newSet.delete(tableId);
        } else {
          newSet.add(tableId);
        }
        return newSet;
      });
    } else {
      setSelectedTables(new Set([tableId]));
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && drawMode === 'none') {
      setSelectedTables(new Set());
    }
  };

  const selectAllTables = () => {
    setSelectedTables(new Set(tables.map(t => t.id)));
  };

  const deselectAllTables = () => {
    setSelectedTables(new Set());
  };

  const getSelectedTablesData = () => {
    return tables.filter(t => selectedTables.has(t.id));
  };

  const alignLeft = async () => {
    const selected = getSelectedTablesData();
    if (selected.length < 2) return;

    const minX = Math.min(...selected.map(t => t.position_x));

    for (const table of selected) {
      await supabase
        .from('tables')
        .update({ position_x: minX })
        .eq('id', table.id);
    }

    if (selectedRoom) loadTables(selectedRoom);
  };

  const alignRight = async () => {
    const selected = getSelectedTablesData();
    if (selected.length < 2) return;

    const maxX = Math.max(...selected.map(t => t.position_x + t.width));

    for (const table of selected) {
      await supabase
        .from('tables')
        .update({ position_x: maxX - table.width })
        .eq('id', table.id);
    }

    if (selectedRoom) loadTables(selectedRoom);
  };

  const alignTop = async () => {
    const selected = getSelectedTablesData();
    if (selected.length < 2) return;

    const minY = Math.min(...selected.map(t => t.position_y));

    for (const table of selected) {
      await supabase
        .from('tables')
        .update({ position_y: minY })
        .eq('id', table.id);
    }

    if (selectedRoom) loadTables(selectedRoom);
  };

  const alignBottom = async () => {
    const selected = getSelectedTablesData();
    if (selected.length < 2) return;

    const maxY = Math.max(...selected.map(t => t.position_y + t.height));

    for (const table of selected) {
      await supabase
        .from('tables')
        .update({ position_y: maxY - table.height })
        .eq('id', table.id);
    }

    if (selectedRoom) loadTables(selectedRoom);
  };

  const alignCenterHorizontal = async () => {
    const selected = getSelectedTablesData();
    if (selected.length < 2) return;

    const centerX = selected.reduce((sum, t) => sum + t.position_x + t.width / 2, 0) / selected.length;

    for (const table of selected) {
      await supabase
        .from('tables')
        .update({ position_x: Math.round(centerX - table.width / 2) })
        .eq('id', table.id);
    }

    if (selectedRoom) loadTables(selectedRoom);
  };

  const alignCenterVertical = async () => {
    const selected = getSelectedTablesData();
    if (selected.length < 2) return;

    const centerY = selected.reduce((sum, t) => sum + t.position_y + t.height / 2, 0) / selected.length;

    for (const table of selected) {
      await supabase
        .from('tables')
        .update({ position_y: Math.round(centerY - table.height / 2) })
        .eq('id', table.id);
    }

    if (selectedRoom) loadTables(selectedRoom);
  };

  const distributeHorizontally = async () => {
    const selected = getSelectedTablesData();
    if (selected.length < 3) return;

    const sorted = [...selected].sort((a, b) => a.position_x - b.position_x);
    const minX = sorted[0].position_x;
    const maxX = sorted[sorted.length - 1].position_x + sorted[sorted.length - 1].width;
    const totalWidth = sorted.reduce((sum, t) => sum + t.width, 0);
    const spacing = (maxX - minX - totalWidth) / (sorted.length - 1);

    let currentX = minX;
    for (const table of sorted) {
      await supabase
        .from('tables')
        .update({ position_x: Math.round(currentX) })
        .eq('id', table.id);
      currentX += table.width + spacing;
    }

    if (selectedRoom) loadTables(selectedRoom);
  };

  const distributeVertically = async () => {
    const selected = getSelectedTablesData();
    if (selected.length < 3) return;

    const sorted = [...selected].sort((a, b) => a.position_y - b.position_y);
    const minY = sorted[0].position_y;
    const maxY = sorted[sorted.length - 1].position_y + sorted[sorted.length - 1].height;
    const totalHeight = sorted.reduce((sum, t) => sum + t.height, 0);
    const spacing = (maxY - minY - totalHeight) / (sorted.length - 1);

    let currentY = minY;
    for (const table of sorted) {
      await supabase
        .from('tables')
        .update({ position_y: Math.round(currentY) })
        .eq('id', table.id);
      currentY += table.height + spacing;
    }

    if (selectedRoom) loadTables(selectedRoom);
  };

  const matchWidth = async () => {
    const selected = getSelectedTablesData();
    if (selected.length < 2) return;

    const maxWidth = Math.max(...selected.map(t => t.width));

    for (const table of selected) {
      await supabase
        .from('tables')
        .update({ width: maxWidth })
        .eq('id', table.id);
    }

    if (selectedRoom) loadTables(selectedRoom);
  };

  const matchHeight = async () => {
    const selected = getSelectedTablesData();
    if (selected.length < 2) return;

    const maxHeight = Math.max(...selected.map(t => t.height));

    for (const table of selected) {
      await supabase
        .from('tables')
        .update({ height: maxHeight })
        .eq('id', table.id);
    }

    if (selectedRoom) loadTables(selectedRoom);
  };

  const fillVerticalSpace = async () => {
    const selected = getSelectedTablesData();
    if (selected.length < 1) return;

    const sorted = [...selected].sort((a, b) => a.position_y - b.position_y);
    const minY = sorted[0].position_y;
    const maxY = sorted[sorted.length - 1].position_y + sorted[sorted.length - 1].height;
    const totalSpace = maxY - minY;
    const heightPerTable = totalSpace / sorted.length;

    let currentY = minY;
    for (const table of sorted) {
      await supabase
        .from('tables')
        .update({
          position_y: Math.round(currentY),
          height: Math.round(heightPerTable)
        })
        .eq('id', table.id);
      currentY += heightPerTable;
    }

    if (selectedRoom) loadTables(selectedRoom);
  };

  const bulkDelete = async () => {
    if (selectedTables.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTables.size} table(s)?`)) return;

    for (const tableId of Array.from(selectedTables)) {
      await supabase
        .from('tables')
        .delete()
        .eq('id', tableId);
    }

    setSelectedTables(new Set());
    if (selectedRoom) loadTables(selectedRoom);
  };

  const getShapeIcon = (shape: string) => {
    switch (shape) {
      case 'circle':
        return <Circle className="w-4 h-4" />;
      case 'square':
        return <Square className="w-4 h-4" />;
      default:
        return <SquareDashedBottom className="w-4 h-4" />;
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-3 print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t('floor_plan.title')}</h2>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <button
              onClick={handlePrint}
              className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition flex-1 sm:flex-initial justify-center"
            >
              <Printer className="w-4 h-4" />
              <span>{t('floor_plan.print')}</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAddTable(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition flex-1 sm:flex-initial justify-center"
              >
                <Plus className="w-4 h-4" />
                <span>{t('floor_plan.add_table')}</span>
              </button>
            )}
          </div>
        </div>

        {!isAdmin && (
          <div className="flex gap-3 items-center bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border border-slate-300 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Legend:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span className="text-sm text-slate-700 dark:text-slate-300">Free</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span className="text-sm text-slate-700 dark:text-slate-300">Booked</span>
            </div>
          </div>
        )}

        {isAdmin && selectedTables.size > 0 && (
          <div className="flex gap-2 flex-wrap bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border-2 border-blue-300 dark:border-blue-700">
            <div className="flex items-center gap-2 pr-2 border-r border-blue-300 dark:border-blue-700">
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                {selectedTables.size} Selected
              </span>
              <button
                onClick={deselectAllTables}
                className="text-xs px-2 py-1 bg-blue-200 dark:bg-blue-800 hover:bg-blue-300 dark:hover:bg-blue-700 text-blue-900 dark:text-blue-100 rounded transition"
              >
                Clear
              </button>
            </div>

            <div className="flex gap-1 pr-2 border-r border-blue-300 dark:border-blue-700">
              <button
                onClick={alignLeft}
                className="p-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition"
                title="Align Left"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={alignCenterHorizontal}
                className="p-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition"
                title="Align Center Horizontal"
              >
                <Minimize2 className="w-4 h-4 rotate-90" />
              </button>
              <button
                onClick={alignRight}
                className="p-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition"
                title="Align Right"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
              <button
                onClick={alignTop}
                className="p-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition"
                title="Align Top"
              >
                <ChevronsUp className="w-4 h-4" />
              </button>
              <button
                onClick={alignCenterVertical}
                className="p-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition"
                title="Align Center Vertical"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={alignBottom}
                className="p-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition"
                title="Align Bottom"
              >
                <ChevronsDown className="w-4 h-4" />
              </button>
            </div>

            {selectedTables.size >= 3 && (
              <div className="flex gap-1 pr-2 border-r border-blue-300 dark:border-blue-700">
                <button
                  onClick={distributeHorizontally}
                  className="p-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition"
                  title="Distribute Horizontally"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
                <button
                  onClick={distributeVertically}
                  className="p-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition"
                  title="Distribute Vertically"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex gap-1 pr-2 border-r border-blue-300 dark:border-blue-700">
              <button
                onClick={matchWidth}
                className="px-2 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition"
                title="Match Width"
              >
                Width
              </button>
              <button
                onClick={matchHeight}
                className="px-2 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition"
                title="Match Height"
              >
                Height
              </button>
              <button
                onClick={fillVerticalSpace}
                className="p-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition"
                title="Fill Vertical Space"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={bulkDelete}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition text-sm flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete ({selectedTables.size})
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="flex gap-2 flex-wrap bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border border-slate-300 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">Draw Mode:</span>
            <button
              onClick={() => setDrawingMode('none')}
              className={`${
                drawMode === 'none'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
              } px-3 py-1.5 rounded-lg flex items-center space-x-2 transition text-sm`}
            >
              <MousePointer2 className="w-4 h-4" />
              <span>Select</span>
            </button>
            <button
              onClick={selectAllTables}
              className="px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg transition text-sm"
            >
              Select All
            </button>
            <button
              onClick={() => setDrawingMode('rectangle')}
              className={`${
                drawMode === 'rectangle'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
              } px-3 py-1.5 rounded-lg flex items-center space-x-2 transition text-sm`}
            >
              <SquareDashedBottom className="w-4 h-4" />
              <span>Rectangle</span>
            </button>
            <button
              onClick={() => setDrawingMode('circle')}
              className={`${
                drawMode === 'circle'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
              } px-3 py-1.5 rounded-lg flex items-center space-x-2 transition text-sm`}
            >
              <Circle className="w-4 h-4" />
              <span>Circle</span>
            </button>
            <button
              onClick={() => setDrawingMode('halfcircle')}
              className={`${
                drawMode === 'halfcircle'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
              } px-3 py-1.5 rounded-lg flex items-center space-x-2 transition text-sm`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22 A10 10 0 0 1 12 2" />
              </svg>
              <span>Half Circle</span>
            </button>
            <button
              onClick={() => setDrawingMode('rotate')}
              className={`${
                drawMode === 'rotate'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
              } px-3 py-1.5 rounded-lg flex items-center space-x-2 transition text-sm`}
            >
              <RotateCw className="w-4 h-4" />
              <span>Rotate</span>
            </button>
            <button
              onClick={() => setDrawingMode('freehand')}
              className={`${
                drawMode === 'freehand'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
              } px-3 py-1.5 rounded-lg flex items-center space-x-2 transition text-sm`}
            >
              <Pen className="w-4 h-4" />
              <span>Freehand</span>
            </button>
            <button
              onClick={() => setDrawingMode('decoration')}
              className={`${
                drawMode === 'decoration'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
              } px-3 py-1.5 rounded-lg flex items-center space-x-2 transition text-sm`}
            >
              <Circle className="w-4 h-4" />
              <span>Circle Deco</span>
            </button>
            <button
              onClick={() => setDrawingMode('decoration-rect')}
              className={`${
                drawMode === 'decoration-rect'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
              } px-3 py-1.5 rounded-lg flex items-center space-x-2 transition text-sm`}
            >
              <Square className="w-4 h-4" />
              <span>Rect Deco</span>
            </button>
            <button
              onClick={() => setDrawingMode('decoration-halfcircle')}
              className={`${
                drawMode === 'decoration-halfcircle'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
              } px-3 py-1.5 rounded-lg flex items-center space-x-2 transition text-sm`}
            >
              <SquareDashedBottom className="w-4 h-4" />
              <span>Half Deco</span>
            </button>
            <button
              onClick={() => setDrawingMode('decoration-text')}
              className={`${
                drawMode === 'decoration-text'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
              } px-3 py-1.5 rounded-lg flex items-center space-x-2 transition text-sm`}
            >
              <Type className="w-4 h-4" />
              <span>Text Box</span>
            </button>
            {paths.length > 0 && (
              <button
                onClick={clearDrawing}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-2 transition text-sm ml-auto"
              >
                <Eraser className="w-4 h-4" />
                <span>Clear Drawing</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 print:hidden">
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => setSelectedRoom(room.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
              selectedRoom === room.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {room.name}
          </button>
        ))}
      </div>

      <div className="hidden print:block text-center mb-2">
        <h1 className="text-2xl font-bold text-black">
          {rooms.find(r => r.id === selectedRoom)?.name || 'Raumplan'}
        </h1>
      </div>

      <div
        id="floor-plan-printable"
        className="floor-plan-canvas bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700 relative overflow-auto touch-none print:bg-white print:border-0 print:rounded-none print:overflow-visible"
        style={{ height: '1120px', minHeight: '840px', maxHeight: 'calc(100vh - 280px)', cursor: drawMode !== 'none' ? 'crosshair' : 'default' }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={() => setDragPreview(null)}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 10 }}
        >
          {paths.map((path, i) => (
            <polyline
              key={i}
              points={path.points.join(',')}
              fill="none"
              stroke={path.color}
              strokeWidth={path.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {drawMode === 'freehand' && currentPath.length > 0 && (
            <polyline
              points={currentPath.join(',')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {drawMode === 'rectangle' && currentPath.length === 4 && (
            <rect
              x={Math.min(currentPath[0], currentPath[2])}
              y={Math.min(currentPath[1], currentPath[3])}
              width={Math.abs(currentPath[2] - currentPath[0])}
              height={Math.abs(currentPath[3] - currentPath[1])}
              fill="rgba(59, 130, 246, 0.2)"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5,5"
            />
          )}
          {drawMode === 'circle' && currentPath.length === 4 && (
            <ellipse
              cx={(currentPath[0] + currentPath[2]) / 2}
              cy={(currentPath[1] + currentPath[3]) / 2}
              rx={Math.abs(currentPath[2] - currentPath[0]) / 2}
              ry={Math.abs(currentPath[3] - currentPath[1]) / 2}
              fill="rgba(59, 130, 246, 0.2)"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5,5"
            />
          )}
          {drawMode === 'halfcircle' && currentPath.length === 4 && (() => {
            const cx = (currentPath[0] + currentPath[2]) / 2;
            const cy = (currentPath[1] + currentPath[3]) / 2;
            const rx = Math.abs(currentPath[2] - currentPath[0]) / 2;
            const ry = Math.abs(currentPath[3] - currentPath[1]) / 2;
            const left = cx - rx;
            const top = cy - ry;
            return (
              <path
                d={`M ${left},${cy} A ${rx},${ry} 0 0,1 ${left + rx * 2},${cy} L ${left + rx * 2},${top + ry * 2} A ${rx},${ry} 0 0,1 ${left},${top + ry * 2} Z`}
                fill="rgba(59, 130, 246, 0.2)"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            );
          })()}
          {drawMode === 'decoration' && currentPath.length === 4 && (
            <ellipse
              cx={(currentPath[0] + currentPath[2]) / 2}
              cy={(currentPath[1] + currentPath[3]) / 2}
              rx={Math.abs(currentPath[2] - currentPath[0]) / 2}
              ry={Math.abs(currentPath[3] - currentPath[1]) / 2}
              fill="none"
              stroke="#9333ea"
              strokeWidth={2}
              strokeDasharray="5,5"
            />
          )}
          {drawMode === 'decoration-rect' && currentPath.length === 4 && (
            <rect
              x={Math.min(currentPath[0], currentPath[2])}
              y={Math.min(currentPath[1], currentPath[3])}
              width={Math.abs(currentPath[2] - currentPath[0])}
              height={Math.abs(currentPath[3] - currentPath[1])}
              fill="none"
              stroke="#9333ea"
              strokeWidth={2}
              strokeDasharray="5,5"
            />
          )}
          {drawMode === 'decoration-halfcircle' && currentPath.length === 4 && (() => {
            const cx = (currentPath[0] + currentPath[2]) / 2;
            const cy = (currentPath[1] + currentPath[3]) / 2;
            const rx = Math.abs(currentPath[2] - currentPath[0]) / 2;
            const ry = Math.abs(currentPath[3] - currentPath[1]) / 2;
            const left = cx - rx;
            const top = cy - ry;
            return (
              <path
                d={`M ${left},${cy} A ${rx},${ry} 0 0,1 ${left + rx * 2},${cy} L ${left + rx * 2},${top + ry * 2} A ${rx},${ry} 0 0,1 ${left},${top + ry * 2} Z`}
                fill="none"
                stroke="#9333ea"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            );
          })()}
          {drawMode === 'decoration-text' && currentPath.length === 4 && (
            <rect
              x={Math.min(currentPath[0], currentPath[2])}
              y={Math.min(currentPath[1], currentPath[3])}
              width={Math.abs(currentPath[2] - currentPath[0])}
              height={Math.abs(currentPath[3] - currentPath[1])}
              fill="none"
              stroke="#9333ea"
              strokeWidth={2}
              strokeDasharray="5,5"
              rx="4"
            />
          )}
        </svg>
        {decorations.map((decoration) => (
          <div
            key={decoration.id}
            className="absolute group"
            style={{
              left: `${decoration.x}px`,
              top: `${decoration.y}px`,
              width: `${decoration.width}px`,
              height: `${decoration.height}px`,
              zIndex: 5,
              cursor: isAdmin && drawMode === 'none' && !resizingTable && !resizingDecoration ? 'default' : 'default',
              transform: decoration.shape === 'halfcircle' ? `rotate(${decoration.rotation || 0}deg)` : undefined,
              transformOrigin: 'center center',
            }}
          >
            {decoration.shape === 'halfcircle' ? (
              <div className="relative w-full h-full overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path
                    d="M 0,50 A 50,50 0 0,1 100,50 L 100,100 A 50,50 0 0,1 0,100 Z"
                    className="fill-none stroke-slate-400 dark:stroke-slate-500 print:stroke-black"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />
                </svg>
              </div>
            ) : decoration.shape === 'text' ? (
              <div className="w-full h-full border-2 border-dashed border-slate-400 dark:border-slate-500 bg-transparent print:border-solid pointer-events-none rounded-lg flex items-center justify-center">
                <input
                  type="text"
                  value={decoration.text || 'Text'}
                  onChange={(e) => {
                    e.stopPropagation();
                    setDecorations(decorations.map(d =>
                      d.id === decoration.id ? { ...d, text: e.target.value } : d
                    ));
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full h-full bg-transparent text-center text-slate-700 dark:text-slate-300 font-semibold pointer-events-auto border-0 outline-none print:text-black"
                  style={{ fontSize: `${Math.min(decoration.width, decoration.height) / 4}px` }}
                />
              </div>
            ) : (
              <div className={`w-full h-full border-2 border-dashed border-slate-400 dark:border-slate-500 bg-transparent print:border-solid pointer-events-none ${decoration.shape === 'circle' ? 'rounded-full' : 'rounded-lg'}`} />
            )}
            {isAdmin && drawMode === 'none' && (
              <>
                <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1 print:hidden">
                  {decoration.shape === 'halfcircle' && (
                    <button
                      onClick={() => setDecorations(decorations.map(d =>
                        d.id === decoration.id ? { ...d, rotation: ((d.rotation || 0) + 90) % 360 } : d
                      ))}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg transition"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => setDecorations(decorations.filter(d => d.id !== decoration.id))}
                    className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div
                  onMouseDown={(e) => handleDecorationResizeStart(e, decoration, 'n')}
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 cursor-ns-resize hidden group-hover:flex items-center justify-center print:hidden"
                  style={{ zIndex: 20 }}
                >
                  <div className="w-6 h-2 bg-purple-500 rounded-full shadow-lg" />
                </div>
                <div
                  onMouseDown={(e) => handleDecorationResizeStart(e, decoration, 's')}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-4 cursor-ns-resize hidden group-hover:flex items-center justify-center print:hidden"
                  style={{ zIndex: 20 }}
                >
                  <div className="w-6 h-2 bg-purple-500 rounded-full shadow-lg" />
                </div>
                <div
                  onMouseDown={(e) => handleDecorationResizeStart(e, decoration, 'w')}
                  className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-8 cursor-ew-resize hidden group-hover:flex items-center justify-center print:hidden"
                  style={{ zIndex: 20 }}
                >
                  <div className="w-2 h-6 bg-purple-500 rounded-full shadow-lg" />
                </div>
                <div
                  onMouseDown={(e) => handleDecorationResizeStart(e, decoration, 'e')}
                  className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-8 cursor-ew-resize hidden group-hover:flex items-center justify-center print:hidden"
                  style={{ zIndex: 20 }}
                >
                  <div className="w-2 h-6 bg-purple-500 rounded-full shadow-lg" />
                </div>
              </>
            )}
          </div>
        ))}
        {tables.map((table) => {
          const isSelected = selectedTables.has(table.id);
          const tableStatus = tableStatuses.get(table.id);
          const isBooked = !isAdmin && tableStatus?.isBooked;
          const isFree = !isAdmin && !tableStatus?.isBooked;

          // For crew: green if free, red if booked
          // For admin: original blue/slate colors
          let bgColor = table.is_bookable ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-600 hover:bg-slate-700';
          let svgFillColor = table.is_bookable ? 'fill-blue-600 hover:fill-blue-700' : 'fill-slate-600 hover:fill-slate-700';

          if (!isAdmin) {
            if (isBooked) {
              bgColor = 'bg-red-600';
              svgFillColor = 'fill-red-600';
            } else if (isFree) {
              bgColor = 'bg-green-600';
              svgFillColor = 'fill-green-600';
            }
          }

          return (
          <div
            key={table.id}
            draggable={isAdmin && drawMode === 'none' && !resizingTable && !resizingDecoration && !draggingDecoration}
            onDragStart={(e) => handleDragStart(e, table.id)}
            onClick={(e) => {
              if (isAdmin) {
                if (drawMode === 'rotate') {
                  handleTableClick(table);
                } else {
                  handleTableSelection(table.id, e);
                }
              }
            }}
            className="absolute group"
            style={{
              cursor: drawMode === 'rotate' ? 'pointer' : (drawMode !== 'none' ? 'crosshair' : (isAdmin ? 'move' : 'default')),
              pointerEvents: (drawMode === 'rotate' || drawMode === 'none') ? 'auto' : 'none',
              left: `${table.position_x}px`,
              top: `${table.position_y}px`,
              width: `${table.width}px`,
              height: `${table.height}px`,
              transform: `rotate(${table.rotation || 0}deg)`,
              transformOrigin: 'center center',
              transition: resizingTable?.id === table.id ? 'none' : 'background-color 0.3s',
              outline: isSelected ? '3px solid #3b82f6' : (resizingTable?.id === table.id ? '2px solid #3b82f6' : undefined),
              outlineOffset: isSelected ? '2px' : undefined,
              opacity: draggedTable === table.id ? 0.3 : 1,
              zIndex: isSelected ? 100 : undefined,
            }}
          >
            {table.shape === 'halfcircle' ? (
              <div className="relative w-full h-full overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path
                    d="M 0,50 A 50,50 0 0,1 100,50 L 100,100 A 50,50 0 0,1 0,100 Z"
                    className={`${svgFillColor} transition stroke-black print:stroke-2`}
                  />
                </svg>
                <div className="relative w-full h-full flex items-center justify-center text-white font-semibold print:text-white">
                  <div className="text-center">
                    {!table.is_bookable && isAdmin && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <Lock className="w-5 h-5 text-white opacity-40" />
                      </div>
                    )}
                    {isBooked && tableStatus ? (
                      <div>
                        <div className="text-sm font-bold">{tableStatus.guestName}</div>
                        <div className="text-xs opacity-75">{tableStatus.reservationTime}</div>
                      </div>
                    ) : table.custom_label ? (
                      <div className="text-lg font-bold">{table.custom_label}</div>
                    ) : (
                      <>
                        {table.table_number && <div className="text-lg">{table.table_number}</div>}
                        {table.capacity > 0 && (
                          <div className="text-xs opacity-75">{table.capacity} {t('floor_plan.seats')}</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center ${bgColor} text-white font-semibold transition print:text-white print:border-2 print:border-black ${
                  table.shape === 'circle' ? 'rounded-full' : 'rounded-lg'
                }`}
              >
                <div className="text-center relative">
                  {!table.is_bookable && isAdmin && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <Lock className="w-5 h-5 text-white opacity-40" />
                    </div>
                  )}
                  {isBooked && tableStatus ? (
                    <div>
                      <div className="text-sm font-bold">{tableStatus.guestName}</div>
                      <div className="text-xs opacity-75">{tableStatus.reservationTime}</div>
                    </div>
                  ) : table.custom_label ? (
                    <div className="text-lg font-bold">{table.custom_label}</div>
                  ) : (
                    <>
                      {table.table_number && <div className="text-lg">{table.table_number}</div>}
                      {table.capacity > 0 && (
                        <div className="text-xs opacity-75">{table.capacity} {t('floor_plan.seats')}</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            {isAdmin && (
              <>
                <div className="absolute top-1/2 left-[140px] -translate-y-1/2 hidden group-hover:flex flex-col space-y-1 print:hidden">
                  <button
                    onClick={(e) => toggleTableBookable(e, table.id, table.is_bookable)}
                    className={`${table.is_bookable ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'} text-white p-1.5 rounded-lg transition`}
                    title={table.is_bookable ? 'Bookable - Click to close' : 'Not bookable - Click to open'}
                  >
                    {table.is_bookable ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingTable(table); }}
                    className="bg-slate-700 dark:bg-slate-900 hover:bg-slate-600 dark:hover:bg-slate-700 text-white p-1.5 rounded-lg transition border border-slate-500 dark:border-slate-600"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTable(table.id); }}
                    className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {drawMode === 'none' && (
                  <>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, table, 'n')}
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 cursor-ns-resize hidden group-hover:flex items-center justify-center print:hidden"
                      style={{ zIndex: 20 }}
                    >
                      <div className="w-6 h-2 bg-blue-500 rounded-full shadow-lg" />
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, table, 's')}
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-4 cursor-ns-resize hidden group-hover:flex items-center justify-center print:hidden"
                      style={{ zIndex: 20 }}
                    >
                      <div className="w-6 h-2 bg-blue-500 rounded-full shadow-lg" />
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, table, 'w')}
                      className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-8 cursor-ew-resize hidden group-hover:flex items-center justify-center print:hidden"
                      style={{ zIndex: 20 }}
                    >
                      <div className="w-2 h-6 bg-blue-500 rounded-full shadow-lg" />
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, table, 'e')}
                      className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-8 cursor-ew-resize hidden group-hover:flex items-center justify-center print:hidden"
                      style={{ zIndex: 20 }}
                    >
                      <div className="w-2 h-6 bg-blue-500 rounded-full shadow-lg" />
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, table, 'nw')}
                      className="absolute -top-2 -left-2 w-5 h-5 cursor-nwse-resize hidden group-hover:flex items-center justify-center print:hidden"
                      style={{ zIndex: 20 }}
                    >
                      <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg" />
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, table, 'ne')}
                      className="absolute -top-2 -right-2 w-5 h-5 cursor-nesw-resize hidden group-hover:flex items-center justify-center print:hidden"
                      style={{ zIndex: 20 }}
                    >
                      <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg" />
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, table, 'sw')}
                      className="absolute -bottom-2 -left-2 w-5 h-5 cursor-nesw-resize hidden group-hover:flex items-center justify-center print:hidden"
                      style={{ zIndex: 20 }}
                    >
                      <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg" />
                    </div>
                    <div
                      onMouseDown={(e) => handleResizeStart(e, table, 'se')}
                      className="absolute -bottom-2 -right-2 w-5 h-5 cursor-nwse-resize hidden group-hover:flex items-center justify-center print:hidden"
                      style={{ zIndex: 20 }}
                    >
                      <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg" />
                    </div>
                  </>
                )}
              </>
            )}
            {resizingTable?.id === table.id && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-semibold shadow-lg">
                  {table.width} × {table.height}
                </div>
              </div>
            )}
          </div>
        );
        })}

        {dragPreview && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${dragPreview.x}px`,
              top: `${dragPreview.y}px`,
              width: `${dragPreview.table.width}px`,
              height: `${dragPreview.table.height}px`,
              transform: `rotate(${dragPreview.table.rotation || 0}deg)`,
              transformOrigin: 'center center',
              opacity: 0.6,
              zIndex: 1000,
            }}
          >
            {dragPreview.table.shape === 'halfcircle' ? (
              <div className="relative w-full h-full overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path
                    d="M 0,50 A 50,50 0 0,1 100,50 L 100,100 A 50,50 0 0,1 0,100 Z"
                    className="fill-blue-400 stroke-blue-600 stroke-2"
                  />
                </svg>
                <div className="relative w-full h-full flex items-center justify-center text-white font-semibold">
                  <div className="text-center">
                    {dragPreview.table.custom_label ? (
                      <div className="text-lg font-bold">{dragPreview.table.custom_label}</div>
                    ) : (
                      <>
                        {dragPreview.table.table_number && <div className="text-lg">{dragPreview.table.table_number}</div>}
                        {dragPreview.table.capacity > 0 && (
                          <div className="text-xs opacity-75">{dragPreview.table.capacity} {t('floor_plan.seats')}</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`w-full h-full ${
                  dragPreview.table.shape === 'circle' ? 'rounded-full' : 'rounded-lg'
                } bg-blue-400 border-2 border-blue-600 flex items-center justify-center text-white font-semibold shadow-lg`}
              >
                <div className="text-center">
                  {dragPreview.table.custom_label ? (
                    <div className="text-lg font-bold">{dragPreview.table.custom_label}</div>
                  ) : (
                    <>
                      {dragPreview.table.table_number && <div className="text-lg">{dragPreview.table.table_number}</div>}
                      {dragPreview.table.capacity > 0 && (
                        <div className="text-xs opacity-75">{dragPreview.table.capacity} seats</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddTable && (
        <TableFormModal
          onClose={() => setShowAddTable(false)}
          onSave={handleAddTable}
          title="Add New Table"
        />
      )}

      {editingTable && (
        <TableFormModal
          table={editingTable}
          onClose={() => setEditingTable(null)}
          onSave={(data) => handleUpdateTable(editingTable.id, data)}
          title={t('floor_plan.edit_table')}
        />
      )}
    </div>
  );
}

function TableFormModal({
  table,
  onClose,
  onSave,
  title,
}: {
  table?: Table;
  onClose: () => void;
  onSave: (data: Partial<Table>) => void;
  title: string;
}) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    table_number: table?.table_number || '',
    capacity: table?.capacity ?? 4,
    width: table?.width || 100,
    height: table?.height || 100,
    shape: table?.shape || 'rectangle' as 'rectangle' | 'circle' | 'square' | 'halfcircle',
    rotation: table?.rotation || 0,
    is_active: table?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{title}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Table Number (optional)
            </label>
            <input
              type="text"
              value={formData.table_number}
              onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Capacity (0 for no seats display)
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
              required
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Width (px)
              </label>
              <input
                type="number"
                min="50"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Height (px)
              </label>
              <input
                type="number"
                min="50"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Shape
            </label>
            <select
              value={formData.shape}
              onChange={(e) => setFormData({ ...formData, shape: e.target.value as any })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="rectangle">Rectangle</option>
              <option value="square">Square</option>
              <option value="circle">Circle</option>
              <option value="halfcircle">Half Circle</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Rotation (degrees)
            </label>
            <input
              type="number"
              min="0"
              max="359"
              step="45"
              value={formData.rotation}
              onChange={(e) => setFormData({ ...formData, rotation: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 rounded"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-slate-700 dark:text-slate-300">
              Active (available for reservations)
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition"
            >
              {t('floor_plan.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              {t('floor_plan.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
