import React, { useState, useEffect } from 'react';

type BookingType = 'single' | 'group';
type Mode = 'book' | 'cancel' | 'view';

interface SeatData {
    timestamp: number;
    employeeId: string;
}

const TOTAL_SEATS = 750;
const BOOKING_DURATION_MS = 45 * 60 * 1000; // 45 minutes

const SeatBooking = () => {
    const [mode, setMode] = useState<Mode>('book');
    const [bookingType, setBookingType] = useState<BookingType | null>(null);
    const [groupSize, setGroupSize] = useState<number>(2);
    const [employeeIds, setEmployeeIds] = useState<string[]>([]);

    // Cancellation Check State
    const [cancelSeatId, setCancelSeatId] = useState<string>('');
    const [cancelEmployeeId, setCancelEmployeeId] = useState<string>('');

    // View Booking State
    const [viewEmployeeId, setViewEmployeeId] = useState<string>('');
    const [viewResult, setViewResult] = useState<{ seat: number; expiresAt: string } | null>(null);
    const [viewMessage, setViewMessage] = useState<string>('');

    // Seat state: null = available, SeatData = booked info
    const [bookedSeats, setBookedSeats] = useState<(SeatData | null)[]>(() => {
        // Initialize with some random booked seats
        return Array(TOTAL_SEATS).fill(null).map(() => {
            if (Math.random() < 0.3) {
                return {
                    timestamp: Date.now() - Math.floor(Math.random() * (BOOKING_DURATION_MS - 60000)),
                    employeeId: `EMP${Math.floor(Math.random() * 1000)}`
                };
            }
            return null;
        });
    });

    // Pointer to the next seat to check (0 to TOTAL_SEATS - 1)
    const [nextSeatIndex, setNextSeatIndex] = useState<number>(0);

    const bookedCount = bookedSeats.filter(b => b !== null).length;
    const availableCount = TOTAL_SEATS - bookedCount;

    // Timer to release expired seats
    useEffect(() => {
        const interval = setInterval(() => {
            setBookedSeats(prevSeats => {
                const now = Date.now();
                let hasChanges = false;
                const newSeats = prevSeats.map(seat => {
                    if (seat && now - seat.timestamp > BOOKING_DURATION_MS) {
                        hasChanges = true;
                        return null; // Release seat
                    }
                    return seat;
                });
                return hasChanges ? newSeats : prevSeats;
            });
        }, 1000 * 60); // Check every minute

        return () => clearInterval(interval);
    }, []);

    const handleTypeSelect = (type: BookingType) => {
        setBookingType(type);
        setEmployeeIds(type === 'single' ? [''] : Array(2).fill(''));
        setGroupSize(2);
    };

    const handleGroupSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const size = parseInt(e.target.value);
        if (size > 6) return; // Max 6 people
        setGroupSize(size);
        // Adjust employee IDs array
        setEmployeeIds(prev => {
            const newIds = [...prev];
            if (size > prev.length) {
                return [...newIds, ...Array(size - newIds.length).fill('')];
            } else {
                return newIds.slice(0, size);
            }
        });
    };

    const handleIdChange = (index: number, value: string) => {
        const newIds = [...employeeIds];
        newIds[index] = value;
        setEmployeeIds(newIds);
    };

    const handleCancelSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const seatIndex = parseInt(cancelSeatId) - 1;

        if (isNaN(seatIndex) || seatIndex < 0 || seatIndex >= TOTAL_SEATS) {
            alert('Invalid Seat Number');
            return;
        }

        const seat = bookedSeats[seatIndex];

        if (!seat) {
            alert('This seat is not currently booked.');
            return;
        }

        if (seat.employeeId.toLowerCase() === cancelEmployeeId.toLowerCase()) {
            // Correct ID, cancel booking
            setBookedSeats(prev => {
                const newSeats = [...prev];
                newSeats[seatIndex] = null;
                return newSeats;
            });
            alert(`Booking for Seat #${cancelSeatId} has been cancelled.`);
            setCancelSeatId('');
            setCancelEmployeeId('');
        } else {
            alert('Employee ID does not match the booking for this seat.');
        }
    };

    const handleViewSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Find bookings for this Employee ID

        const foundSeats = bookedSeats
            .map((seat, index) => ({ seat, index }))
            .filter(({ seat }) => seat && seat.employeeId.toLowerCase() === viewEmployeeId.toLowerCase());

        if (foundSeats.length > 0) {
            // Sort by expiry time potentially? Just allow the first one for now or iterate.
            // Since the user might just want to see *their* seat, let's show the first one.
            const { seat, index } = foundSeats[0];
            if (seat) {
                const expiryTime = new Date(seat.timestamp + BOOKING_DURATION_MS).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setViewResult({ seat: index + 1, expiresAt: expiryTime });
                setViewMessage('');
            }
        } else {
            setViewResult(null);
            setViewMessage('No active booking found for this Employee ID.');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Check for duplicate bookings first
        // Create an array of IDs to check based on booking type
        const idsToCheck = bookingType === 'single'
            ? [employeeIds[0]]
            : employeeIds.slice(0, groupSize); // Only check relevant IDs for group size

        // Normalize IDs for comparison
        const normalizedIdsToCheck = idsToCheck.map(id => id.toLowerCase().trim());

        // Check for duplicate IDs within the group itself
        const uniqueIds = new Set(normalizedIdsToCheck);
        if (uniqueIds.size !== normalizedIdsToCheck.length) {
            alert('Duplicate Employee IDs found in this group. Please ensure each person has a unique ID.');
            return;
        }

        // Find if any of these IDs already have a booking
        const existingBooking = bookedSeats.find(seat =>
            seat && normalizedIdsToCheck.includes(seat.employeeId.toLowerCase())
        );

        if (existingBooking) {
            const conflictingId = existingBooking.employeeId;
            alert(`Seat already reserved for Employee ID: ${conflictingId}. Redirecting to view details.`);

            // Switch to view mode and show details
            setMode('view');
            setViewEmployeeId(conflictingId);

            // Trigger view logic immediately
            const seatIndex = bookedSeats.findIndex(s => s && s.employeeId.toLowerCase() === conflictingId.toLowerCase());
            if (seatIndex !== -1) {
                const expiryTime = new Date(existingBooking.timestamp + BOOKING_DURATION_MS).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setViewResult({ seat: seatIndex + 1, expiresAt: expiryTime });
                setViewMessage('');
            }

            // Reset booking form partially or fully if needed, but switching modes hides it anyway
            setBookingType(null);
            return;
        }

        const seatsNeeded = bookingType === 'single' ? 1 : groupSize;

        if (seatsNeeded > availableCount) {
            alert(`Not enough seats available! Only ${availableCount} left.`);
            return;
        }

        // Find available seat indices sequentially
        const assignedSeatIndices: number[] = [];
        const newBookedSeats = [...bookedSeats];
        const now = Date.now();

        let currentIndex = nextSeatIndex;
        let seatsFound = 0;
        let checkedCount = 0;

        // Loop at most TOTAL_SEATS times
        while (seatsFound < seatsNeeded && checkedCount < TOTAL_SEATS) {
            if (newBookedSeats[currentIndex] === null) {
                // Determine which employee ID corresponds to this seat
                // For single booking: employeeIds[0]
                // For group booking: employeeIds[seatsFound]
                const empId = employeeIds[seatsFound] || 'UNKNOWN';

                newBookedSeats[currentIndex] = {
                    timestamp: now,
                    employeeId: empId
                };
                assignedSeatIndices.push(currentIndex);
                seatsFound++;
            }

            currentIndex++;
            if (currentIndex >= TOTAL_SEATS) {
                currentIndex = 0; // Wrap around
            }
            checkedCount++;
        }

        setBookedSeats(newBookedSeats);
        setNextSeatIndex(currentIndex); // Update pointer for next booking

        // Convert indices to 1-based seat numbers
        const assignedSeatNumbers = assignedSeatIndices.map(i => i + 1);

        // Calculate expiry time
        const expiryTime = new Date(now + BOOKING_DURATION_MS).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        console.log('Booking submitted:', { bookingType, employeeIds, assignedSeats: assignedSeatNumbers });
        alert(`Booking Confirmed!\nDuration: 45 mins.\nExpires at: ${expiryTime}\nYour Seat Number(s): ${assignedSeatNumbers.map(n => `#${n}`).join(', ')}\n(Total Seats: ${TOTAL_SEATS})`);

        // Reset form
        setBookingType(null);
    };

    const occupancyPercentage = Math.round((bookedCount / TOTAL_SEATS) * 100);

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold mb-2 text-center text-gray-800">Cafeteria Seat Booking</h2>

            {/* Stats Bar */}
            <div className="mb-6 bg-gray-100 p-3 rounded-lg">
                <div className="flex justify-between text-sm mb-1 text-gray-600">
                    <span>Booked: <span className="font-bold text-gray-800">{bookedCount}</span></span>
                    <span>Available: <span className="font-bold text-green-600">{availableCount}</span></span>
                </div>
                <div className="w-full bg-gray-300 rounded-full h-2.5">
                    <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${occupancyPercentage}%` }}
                    ></div>
                </div>
                <p className="text-xs text-center mt-1 text-gray-500">{occupancyPercentage}% Occupied</p>
            </div>

            {/* Mode Switcher */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => { setMode('book'); setBookingType(null); }}
                    className={`flex-1 py-2 text-sm font-medium ${mode === 'book' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Book
                </button>
                <button
                    onClick={() => setMode('view')}
                    className={`flex-1 py-2 text-sm font-medium ${mode === 'view' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    View
                </button>
                <button
                    onClick={() => setMode('cancel')}
                    className={`flex-1 py-2 text-sm font-medium ${mode === 'cancel' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Cancel
                </button>
            </div>

            {mode === 'view' && (
                <form onSubmit={handleViewSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Check Booking Status</label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Enter Employee ID"
                            value={viewEmployeeId}
                            onChange={(e) => {
                                setViewEmployeeId(e.target.value);
                                setViewResult(null);
                                setViewMessage('');
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition mt-4"
                    >
                        Search Booking
                    </button>

                    {viewResult && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center animate-pulse-once">
                            <p className="text-green-800 font-bold text-lg">Active Booking Found</p>
                            <p className="text-gray-700 mt-2">Seat Number: <span className="font-bold text-black">#{viewResult.seat}</span></p>
                            <p className="text-gray-600 text-sm">Expires at: <span className="font-medium">{viewResult.expiresAt}</span></p>
                        </div>
                    )}

                    {viewMessage && !viewResult && (
                        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                            <p className="text-gray-600 font-medium">{viewMessage}</p>
                        </div>
                    )}
                </form>
            )}

            {mode === 'cancel' && (
                <form onSubmit={handleCancelSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Seat Number to Cancel</label>
                        <input
                            type="number"
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="Ex: 45"
                            value={cancelSeatId}
                            onChange={(e) => setCancelSeatId(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Verify Employee ID</label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="Enter the ID used for booking"
                            value={cancelEmployeeId}
                            onChange={(e) => setCancelEmployeeId(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition mt-4"
                    >
                        Cancel Booking
                    </button>
                </form>
            )}

            {mode === 'book' && (
                <>
                    <p className="text-center text-sm text-gray-500 mb-6">Max duration: 45 mins</p>

                    {!bookingType ? (
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => handleTypeSelect('single')}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                                Single Booking
                            </button>
                            <button
                                onClick={() => handleTypeSelect('group')}
                                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                                Group Booking
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex items-center justify-between mb-6">
                                <button
                                    type="button"
                                    onClick={() => setBookingType(null)}
                                    className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-sm font-medium transition"
                                >
                                    <span>←</span> Back
                                </button>
                                <span className="font-bold capitalize text-gray-800 text-lg">{bookingType} Booking</span>
                                <div className="w-12"></div> {/* Spacer for centering title if needed, or just empty */}
                            </div>

                            {bookingType === 'single' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Ex: EMP123"
                                        value={employeeIds[0] || ''}
                                        onChange={(e) => handleIdChange(0, e.target.value)}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Number of People (Max 6)</label>
                                        <input
                                            type="number"
                                            min="2"
                                            max="6"
                                            required
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                            value={groupSize}
                                            onChange={handleGroupSizeChange}
                                        />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                                        {employeeIds.map((id, index) => (
                                            <div key={index}>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID #{index + 1}</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                                    placeholder={`Person ${index + 1} ID`}
                                                    value={id}
                                                    onChange={(e) => handleIdChange(index, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <button
                                type="submit"
                                className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition mt-4"
                            >
                                Confirm {bookingType === 'single' ? 1 : groupSize} Seat{bookingType === 'single' ? '' : 's'}
                            </button>
                            <p className="text-xs text-center text-gray-500">
                                {availableCount} seats currently available
                            </p>
                        </form>
                    )}
                </>
            )}
        </div>
    );
};

export default SeatBooking;
