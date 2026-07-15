interface TournamentData {
  id: number;
  name: string;
  pairs: PairData[];
  totalPairs: number;
}

interface PairData {
  id: string;
  team1: string;
  team2: string;
  registeredAt: string;
  status: string;
}

class LetzplayService {
  private baseUrl = 'https://api.letzplay.me';
  private webUrl = 'https://letzplay.me';

  async fetchTournamentData(tournamentId: number): Promise<TournamentData> {
    try {
      // Tenta a API oficial primeiro
      return await this.fetchFromAPI(tournamentId);
    } catch (error) {
      console.warn('API indisponível, tentando web scraping...');
      return await this.fetchFromWeb(tournamentId);
    }
  }

  private async fetchFromAPI(tournamentId: number): Promise<TournamentData> {
    const response = await fetch(
      `${this.baseUrl}/tournaments/${tournamentId}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BT-Vision/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return this.parseTournamentData(data);
  }

  private async fetchFromWeb(tournamentId: number): Promise<TournamentData> {
    const url = `${this.webUrl}/circuitoturn/tourneys/${tournamentId}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return this.parseHTMLForTournamentData(html, tournamentId);
    } catch (error) {
      console.error('Web scraping failed:', error);
      throw new Error(
        'Não foi possível acessar dados do torneio na Letzplay. ' +
        'Verifique se o ID está correto e se você tem acesso à página.'
      );
    }
  }

  private parseTournamentData(data: any): TournamentData {
    return {
      id: data.id || data.tournament_id,
      name: data.name || data.tournament_name || 'Torneio',
      pairs: data.pairs || data.teams || [],
      totalPairs: data.total_pairs || data.pairs?.length || 0,
    };
  }

  private parseHTMLForTournamentData(
    html: string,
    tournamentId: number
  ): TournamentData {
    // Procura por padrões comuns de contagem de duplas/times
    const patterns = [
      /(\d+)\s*(?:duplas?|pairs?|equipes?|teams?)/gi,
      /registr[^>]*[>:]?\s*(\d+)/gi,
      /"count"\s*:\s*(\d+)/gi,
      /data-count="(\d+)"/gi,
    ];

    let totalPairs = 0;
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const num = parseInt(match[0].replace(/\D/g, ''), 10);
        if (num > 0) {
          totalPairs = num;
          break;
        }
      }
    }

    // Tenta extrair o nome do torneio
    const nameMatch = html.match(
      /<h1[^>]*>([^<]+)<\/h1>|<title>([^<]+)<\/title>/i
    );
    const name = nameMatch ? nameMatch[1] || nameMatch[2] : 'Torneio';

    return {
      id: tournamentId,
      name: name.trim(),
      pairs: [],
      totalPairs: totalPairs || 0,
    };
  }

  formatTournamentReport(data: TournamentData): string {
    const divider = '═'.repeat(50);
    const lines = [
      '',
      divider,
      `📋 TORNEIO: ${data.name}`,
      `🆔 ID: ${data.id}`,
      divider,
      `👥 DUPLAS INSCRITAS: ${data.totalPairs}`,
      divider,
      '',
    ];

    if (data.pairs.length > 0) {
      lines.push('DUPLAS:');
      lines.push('-'.repeat(50));
      data.pairs.forEach((pair, index) => {
        lines.push(
          `${index + 1}. ${pair.team1} vs ${pair.team2} (${pair.status})`
        );
      });
      lines.push('');
    }

    return lines.join('\n');
  }
}

export const letzplayService = new LetzplayService();
export type { TournamentData, PairData };
