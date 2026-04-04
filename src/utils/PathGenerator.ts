import { PathPoint } from './Constants';

export function generateRandomPath(mapSize: number, minLength: number): PathPoint[] {
  const directions = [
    { row: 0, col: 1 },
    { row: 0, col: -1 },
    { row: 1, col: 0 },
    { row: -1, col: 0 }
  ];

  let path: PathPoint[] = [];
  let attempts = 0;

  while (attempts < 1000) {
    attempts++;
    path = [];
    const visited = new Set<string>();
    
    // Start at a random point on the upper-left edge (col = 0)
    let curr: PathPoint = { row: Math.floor(Math.random() * (mapSize - 2)) + 1, col: 0 };

    path.push(curr);
    visited.add(`${curr.row},${curr.col}`);

    let failedMoves = 0;
    let consecutiveEdgeCount = 1; // Мы начали на краю

    while (failedMoves < 10) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const next = { row: curr.row + dir.row, col: curr.col + dir.col };

      if (
        next.row >= 0 && next.row < mapSize &&
        next.col >= 0 && next.col < mapSize &&
        !visited.has(`${next.row},${next.col}`)
      ) {
        const isNextOnEdge = next.row === 0 || next.row === mapSize - 1 || next.col === 0 || next.col === mapSize - 1;
        
        // Если следующая клетка на краю и мы уже превысили лимит в 4 клетки на краю
        if (isNextOnEdge && consecutiveEdgeCount >= 4) {
          failedMoves++;
          continue;
        }

        // Check if next tile has more than 1 visited neighbor (to prevent path from touching itself)
        let visitedNeighbors = 0;
        for (const d of directions) {
          if (visited.has(`${next.row + d.row},${next.col + d.col}`)) {
            visitedNeighbors++;
          }
        }

        if (visitedNeighbors === 1) {
          curr = next;
          path.push(curr);
          visited.add(`${curr.row},${curr.col}`);
          failedMoves = 0;
          
          if (isNextOnEdge) {
            consecutiveEdgeCount++;
          } else {
            consecutiveEdgeCount = 0;
          }
          
          // Check if we reached another edge (NOT the starting edge) and path is long enough
          const isEdge = curr.row === 0 || curr.row === mapSize - 1 || curr.col === mapSize - 1;
          if (isEdge && path.length >= minLength) {
            return path;
          }
        } else {
          failedMoves++;
        }
      } else {
        failedMoves++;
      }
    }
  }

  // Fallback if random generation fails too many times
  return [
    { row: 0, col: 0 },
    { row: 0, col: mapSize - 1 },
    { row: mapSize - 1, col: mapSize - 1 }
  ];
}
