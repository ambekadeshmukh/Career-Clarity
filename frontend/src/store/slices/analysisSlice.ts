import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getAnalysisHistory, JobAnalysis } from '../../services/jobAnalysisService';

interface AnalysisState {
  analyses: JobAnalysis[];
  loading: boolean;
  error: string | null;
}

const initialState: AnalysisState = {
  analyses: [],
  loading: false,
  error: null
};

// Async thunk for fetching analysis history
export const fetchAnalysisHistory = createAsyncThunk(
  'analysis/fetchHistory',
  async (_, { rejectWithValue }) => {
    try {
      const analyses = await getAnalysisHistory();
      return analyses;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    addAnalysis: (state, action: PayloadAction<JobAnalysis>) => {
      // Add new analysis to the beginning of the array
      state.analyses.unshift(action.payload);
    },
    clearAnalyses: (state) => {
      state.analyses = [];
    },
    updateAnalysis: (state, action: PayloadAction<{ id: string; updates: Partial<JobAnalysis> }>) => {
      const { id, updates } = action.payload;
      const index = state.analyses.findIndex(analysis => analysis.id === id);
      
      if (index !== -1) {
        state.analyses[index] = { ...state.analyses[index], ...updates };
      }
    },
    removeAnalysis: (state, action: PayloadAction<string>) => {
      state.analyses = state.analyses.filter(analysis => analysis.id !== action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalysisHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnalysisHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.analyses = action.payload;
      })
      .addCase(fetchAnalysisHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { addAnalysis, clearAnalyses, updateAnalysis, removeAnalysis } = analysisSlice.actions;

export default analysisSlice.reducer;