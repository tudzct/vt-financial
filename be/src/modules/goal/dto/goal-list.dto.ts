/** Saving goal and calculated current-month progress returned to the client. */
export interface SavingGoalDto {
  goal_id: number;
  goal_type: 'Saving';
  target_amount: number;
  target_achieved: number;
  start_date: string;
  end_date: string;
}

/** Expense-limit goal and calculated current-month category spending. */
export interface ExpenseGoalDto {
  goal_id: number;
  category: string;
  target_amount: number;
  current_expense: number;
}

/** Data payload returned by the protected goal-list endpoint. */
export interface GoalListDataDto {
  savingGoal: SavingGoalDto | null;
  expenseGoals: ExpenseGoalDto[];
}
