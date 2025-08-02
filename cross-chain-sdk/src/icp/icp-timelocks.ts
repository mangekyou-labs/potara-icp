export interface ICPTimelocksData {
    srcWithdrawal: number
    srcPublicWithdrawal: number
    srcCancellation: number
    srcPublicCancellation: number
    dstWithdrawal: number
    dstPublicWithdrawal: number
    dstCancellation: number
}

export class ICPTimelocks {
    public readonly srcWithdrawal: number
    public readonly srcPublicWithdrawal: number
    public readonly srcCancellation: number
    public readonly srcPublicCancellation: number
    public readonly dstWithdrawal: number
    public readonly dstPublicWithdrawal: number
    public readonly dstCancellation: number

    constructor(data: ICPTimelocksData) {
        this.srcWithdrawal = data.srcWithdrawal
        this.srcPublicWithdrawal = data.srcPublicWithdrawal
        this.srcCancellation = data.srcCancellation
        this.srcPublicCancellation = data.srcPublicCancellation
        this.dstWithdrawal = data.dstWithdrawal
        this.dstPublicWithdrawal = data.dstPublicWithdrawal
        this.dstCancellation = data.dstCancellation
    }

    /**
     * Create default ICP timelocks with reasonable defaults
     */
    public static createDefault(): ICPTimelocks {
        return new ICPTimelocks({
            srcWithdrawal: 10,
            srcPublicWithdrawal: 120,
            srcCancellation: 121,
            srcPublicCancellation: 240,
            dstWithdrawal: 10,
            dstPublicWithdrawal: 100,
            dstCancellation: 101
        })
    }

    /**
     * Create ICP timelocks from bytes (for cross-chain compatibility)
     */
    public static fromBytes(bytes: Uint8Array): ICPTimelocks {
        if (bytes.length < 28) { // 7 timelocks * 4 bytes each
            throw new Error('Invalid timelocks bytes: insufficient length')
        }

        const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
        
        return new ICPTimelocks({
            srcWithdrawal: dataView.getUint32(0, true),
            srcPublicWithdrawal: dataView.getUint32(4, true),
            srcCancellation: dataView.getUint32(8, true),
            srcPublicCancellation: dataView.getUint32(12, true),
            dstWithdrawal: dataView.getUint32(16, true),
            dstPublicWithdrawal: dataView.getUint32(20, true),
            dstCancellation: dataView.getUint32(24, true)
        })
    }

    /**
     * Convert timelocks to bytes (for cross-chain compatibility)
     */
    public toBytes(): Uint8Array {
        const bytes = new Uint8Array(28) // 7 timelocks * 4 bytes each
        const dataView = new DataView(bytes.buffer)
        
        dataView.setUint32(0, this.srcWithdrawal, true)
        dataView.setUint32(4, this.srcPublicWithdrawal, true)
        dataView.setUint32(8, this.srcCancellation, true)
        dataView.setUint32(12, this.srcPublicCancellation, true)
        dataView.setUint32(16, this.dstWithdrawal, true)
        dataView.setUint32(20, this.dstPublicWithdrawal, true)
        dataView.setUint32(24, this.dstCancellation, true)
        
        return bytes
    }

    /**
     * Create ICP timelocks from EVM timelocks for cross-chain compatibility
     */
    public static fromEVMTimelocks(evmTimelocks: any): ICPTimelocks {
        return new ICPTimelocks({
            srcWithdrawal: Number(evmTimelocks.srcWithdrawal),
            srcPublicWithdrawal: Number(evmTimelocks.srcPublicWithdrawal),
            srcCancellation: Number(evmTimelocks.srcCancellation),
            srcPublicCancellation: Number(evmTimelocks.srcPublicCancellation),
            dstWithdrawal: Number(evmTimelocks.dstWithdrawal),
            dstPublicWithdrawal: Number(evmTimelocks.dstPublicWithdrawal),
            dstCancellation: Number(evmTimelocks.dstCancellation)
        })
    }

    /**
     * Convert to EVM-compatible format for cross-chain operations
     */
    public toEVMFormat(): any {
        return {
            srcWithdrawal: BigInt(this.srcWithdrawal),
            srcPublicWithdrawal: BigInt(this.srcPublicWithdrawal),
            srcCancellation: BigInt(this.srcCancellation),
            srcPublicCancellation: BigInt(this.srcPublicCancellation),
            dstWithdrawal: BigInt(this.dstWithdrawal),
            dstPublicWithdrawal: BigInt(this.dstPublicWithdrawal),
            dstCancellation: BigInt(this.dstCancellation)
        }
    }

    /**
     * Create timelocks with relative durations (seconds from deployment)
     */
    public static createRelative(durations: {
        srcWithdrawal?: number
        srcPublicWithdrawal?: number
        srcCancellation?: number
        srcPublicCancellation?: number
        dstWithdrawal?: number
        dstPublicWithdrawal?: number
        dstCancellation?: number
    }): ICPTimelocks {
        return new ICPTimelocks({
            srcWithdrawal: durations.srcWithdrawal || 10,
            srcPublicWithdrawal: durations.srcPublicWithdrawal || 120,
            srcCancellation: durations.srcCancellation || 121,
            srcPublicCancellation: durations.srcPublicCancellation || 240,
            dstWithdrawal: durations.dstWithdrawal || 10,
            dstPublicWithdrawal: durations.dstPublicWithdrawal || 100,
            dstCancellation: durations.dstCancellation || 101
        })
    }

    /**
     * Create timelocks with absolute timestamps
     */
    public static createAbsolute(timestamps: {
        srcWithdrawal?: number
        srcPublicWithdrawal?: number
        srcCancellation?: number
        srcPublicCancellation?: number
        dstWithdrawal?: number
        dstPublicWithdrawal?: number
        dstCancellation?: number
    }): ICPTimelocks {
        return new ICPTimelocks({
            srcWithdrawal: timestamps.srcWithdrawal || 0,
            srcPublicWithdrawal: timestamps.srcPublicWithdrawal || 0,
            srcCancellation: timestamps.srcCancellation || 0,
            srcPublicCancellation: timestamps.srcPublicCancellation || 0,
            dstWithdrawal: timestamps.dstWithdrawal || 0,
            dstPublicWithdrawal: timestamps.dstPublicWithdrawal || 0,
            dstCancellation: timestamps.dstCancellation || 0
        })
    }

    /**
     * Calculate absolute timestamps from relative durations
     */
    public calculateAbsoluteTimestamps(deployedAt: number): ICPTimelocks {
        return new ICPTimelocks({
            srcWithdrawal: deployedAt + this.srcWithdrawal,
            srcPublicWithdrawal: deployedAt + this.srcPublicWithdrawal,
            srcCancellation: deployedAt + this.srcCancellation,
            srcPublicCancellation: deployedAt + this.srcPublicCancellation,
            dstWithdrawal: deployedAt + this.dstWithdrawal,
            dstPublicWithdrawal: deployedAt + this.dstPublicWithdrawal,
            dstCancellation: deployedAt + this.dstCancellation
        })
    }

    /**
     * Check if a specific timelock is met
     */
    public isTimelockMet(timelockType: keyof ICPTimelocksData, currentTime: number): boolean {
        return currentTime >= this[timelockType]
    }

    /**
     * Check if withdrawal is allowed (public or private)
     */
    public isWithdrawalAllowed(isPublic: boolean, currentTime: number): boolean {
        if (isPublic) {
            return this.isTimelockMet('srcPublicWithdrawal', currentTime) || 
                   this.isTimelockMet('dstPublicWithdrawal', currentTime)
        } else {
            return this.isTimelockMet('srcWithdrawal', currentTime) || 
                   this.isTimelockMet('dstWithdrawal', currentTime)
        }
    }

    /**
     * Check if cancellation is allowed
     */
    public isCancellationAllowed(currentTime: number): boolean {
        return this.isTimelockMet('srcCancellation', currentTime) || 
               this.isTimelockMet('dstCancellation', currentTime)
    }

    /**
     * Get the next timelock to be met
     */
    public getNextTimelock(currentTime: number): { type: keyof ICPTimelocksData; time: number } | null {
        const timelocks: Array<{ type: keyof ICPTimelocksData; time: number }> = [
            { type: 'srcWithdrawal', time: this.srcWithdrawal },
            { type: 'srcPublicWithdrawal', time: this.srcPublicWithdrawal },
            { type: 'srcCancellation', time: this.srcCancellation },
            { type: 'srcPublicCancellation', time: this.srcPublicCancellation },
            { type: 'dstWithdrawal', time: this.dstWithdrawal },
            { type: 'dstPublicWithdrawal', time: this.dstPublicWithdrawal },
            { type: 'dstCancellation', time: this.dstCancellation }
        ]

        const futureTimelocks = timelocks
            .filter(tl => tl.time > currentTime)
            .sort((a, b) => a.time - b.time)

        return futureTimelocks.length > 0 ? futureTimelocks[0] : null
    }

    /**
     * Get all timelocks that have been met
     */
    public getMetTimelocks(currentTime: number): (keyof ICPTimelocksData)[] {
        const metTimelocks: (keyof ICPTimelocksData)[] = []
        
        if (this.isTimelockMet('srcWithdrawal', currentTime)) metTimelocks.push('srcWithdrawal')
        if (this.isTimelockMet('srcPublicWithdrawal', currentTime)) metTimelocks.push('srcPublicWithdrawal')
        if (this.isTimelockMet('srcCancellation', currentTime)) metTimelocks.push('srcCancellation')
        if (this.isTimelockMet('srcPublicCancellation', currentTime)) metTimelocks.push('srcPublicCancellation')
        if (this.isTimelockMet('dstWithdrawal', currentTime)) metTimelocks.push('dstWithdrawal')
        if (this.isTimelockMet('dstPublicWithdrawal', currentTime)) metTimelocks.push('dstPublicWithdrawal')
        if (this.isTimelockMet('dstCancellation', currentTime)) metTimelocks.push('dstCancellation')
        
        return metTimelocks
    }

    /**
     * Validate timelock configuration
     */
    public validate(): { isValid: boolean; errors: string[] } {
        const errors: string[] = []

        // Check for negative values
        if (this.srcWithdrawal < 0) errors.push('srcWithdrawal cannot be negative')
        if (this.srcPublicWithdrawal < 0) errors.push('srcPublicWithdrawal cannot be negative')
        if (this.srcCancellation < 0) errors.push('srcCancellation cannot be negative')
        if (this.srcPublicCancellation < 0) errors.push('srcPublicCancellation cannot be negative')
        if (this.dstWithdrawal < 0) errors.push('dstWithdrawal cannot be negative')
        if (this.dstPublicWithdrawal < 0) errors.push('dstPublicWithdrawal cannot be negative')
        if (this.dstCancellation < 0) errors.push('dstCancellation cannot be negative')

        // Check logical ordering
        if (this.srcWithdrawal >= this.srcPublicWithdrawal) {
            errors.push('srcWithdrawal must be before srcPublicWithdrawal')
        }
        if (this.srcPublicWithdrawal >= this.srcCancellation) {
            errors.push('srcPublicWithdrawal must be before srcCancellation')
        }
        if (this.dstWithdrawal >= this.dstPublicWithdrawal) {
            errors.push('dstWithdrawal must be before dstPublicWithdrawal')
        }
        if (this.dstPublicWithdrawal >= this.dstCancellation) {
            errors.push('dstPublicWithdrawal must be before dstCancellation')
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }

    /**
     * Convert to plain object
     */
    public toObject(): ICPTimelocksData {
        return {
            srcWithdrawal: this.srcWithdrawal,
            srcPublicWithdrawal: this.srcPublicWithdrawal,
            srcCancellation: this.srcCancellation,
            srcPublicCancellation: this.srcPublicCancellation,
            dstWithdrawal: this.dstWithdrawal,
            dstPublicWithdrawal: this.dstPublicWithdrawal,
            dstCancellation: this.dstCancellation
        }
    }

    /**
     * Create a copy with updates
     */
    public clone(updates: Partial<ICPTimelocksData>): ICPTimelocks {
        return new ICPTimelocks({
            srcWithdrawal: updates.srcWithdrawal ?? this.srcWithdrawal,
            srcPublicWithdrawal: updates.srcPublicWithdrawal ?? this.srcPublicWithdrawal,
            srcCancellation: updates.srcCancellation ?? this.srcCancellation,
            srcPublicCancellation: updates.srcPublicCancellation ?? this.srcPublicCancellation,
            dstWithdrawal: updates.dstWithdrawal ?? this.dstWithdrawal,
            dstPublicWithdrawal: updates.dstPublicWithdrawal ?? this.dstPublicWithdrawal,
            dstCancellation: updates.dstCancellation ?? this.dstCancellation
        })
    }
}

export default ICPTimelocks 