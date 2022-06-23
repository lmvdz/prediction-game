export interface DataUpdatable<T> {
    updateData(data: T): Promise<boolean>;
}
