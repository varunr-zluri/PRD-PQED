/**
 * Slack Service Tests - Comprehensive coverage
 */

// Store mock functions for manipulation in tests
let mockLookupByEmail = jest.fn().mockRejectedValue(new Error('users_not_found'));
let mockPostMessage = jest.fn().mockResolvedValue({ ok: true });

// Mock the Slack WebClient BEFORE importing slackService
jest.mock('@slack/web-api', () => ({
    WebClient: jest.fn().mockImplementation(() => ({
        users: {
            lookupByEmail: (...args) => mockLookupByEmail(...args)
        },
        chat: {
            postMessage: (...args) => mockPostMessage(...args)
        }
    }))
}));

// Now import after mock is set up
const slackService = require('../src/services/slackService');
const { WebClient } = require('@slack/web-api');

describe('Slack Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset to default behavior
        mockLookupByEmail = jest.fn().mockRejectedValue(new Error('users_not_found'));
        mockPostMessage = jest.fn().mockResolvedValue({ ok: true });
    });

    describe('getUserByEmail', () => {
        it('should return null for empty email', async () => {
            const result = await slackService.getUserByEmail('');
            expect(result).toBeNull();
        });

        it('should return null for null email', async () => {
            const result = await slackService.getUserByEmail(null);
            expect(result).toBeNull();
        });

        it('should return user ID when user found', async () => {
            mockLookupByEmail.mockResolvedValue({ user: { id: 'U123', name: 'testuser' } });

            const result = await slackService.getUserByEmail('test@example.com');
            expect(result).toBe('U123');
        });

        it('should return null when lookup fails', async () => {
            mockLookupByEmail.mockRejectedValue(new Error('user_not_found'));

            const result = await slackService.getUserByEmail('nonexistent@example.com');
            expect(result).toBeNull();
        });
    });

    describe('sendDM', () => {
        it('should return false for empty userId', async () => {
            const result = await slackService.sendDM('', 'test message');
            expect(result).toBe(false);
        });

        it('should return false for null userId', async () => {
            const result = await slackService.sendDM(null, 'test message');
            expect(result).toBe(false);
        });

        it('should send message successfully', async () => {
            mockPostMessage.mockResolvedValue({ ok: true });

            const result = await slackService.sendDM('U123', 'test message');
            expect(result).toBe(true);
            expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
                channel: 'U123',
                text: 'test message'
            }));
        });

        it('should send message with blocks', async () => {
            mockPostMessage.mockResolvedValue({ ok: true });
            const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: 'Test' } }];

            const result = await slackService.sendDM('U123', 'test message', blocks);
            expect(result).toBe(true);
            expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
                blocks
            }));
        });

        it('should return false when message fails', async () => {
            mockPostMessage.mockRejectedValue(new Error('channel_not_found'));

            const result = await slackService.sendDM('U123', 'test message');
            expect(result).toBe(false);
        });
    });

    describe('notifyNewSubmission', () => {
        it('should handle submission without channel configured', async () => {
            // APPROVAL_CHANNEL is set at module load time, so we just verify it doesn't throw
            mockPostMessage.mockResolvedValue({ ok: true });

            const mockRequest = {
                instance_name: 'test-db',
                db_type: 'POSTGRESQL',
                pod_name: 'POD_1',
                submission_type: 'QUERY',
                query_content: 'SELECT 1'
            };
            const mockRequester = { name: 'Test User', email: 'test@example.com' };

            await expect(
                slackService.notifyNewSubmission(mockRequest, mockRequester, null)
            ).resolves.not.toThrow();
        });

        it('should notify manager when email provided', async () => {
            mockLookupByEmail.mockResolvedValue({ user: { id: 'U456' } });
            mockPostMessage.mockResolvedValue({ ok: true });

            const mockRequest = {
                instance_name: 'test-db',
                db_type: 'POSTGRESQL',
                pod_name: 'POD_1',
                submission_type: 'QUERY',
                query_content: 'SELECT * FROM users WHERE id = 1'
            };
            const mockRequester = { name: 'Test User', email: 'test@example.com' };

            await slackService.notifyNewSubmission(mockRequest, mockRequester, 'manager@example.com');
            expect(mockLookupByEmail).toHaveBeenCalledWith({ email: 'manager@example.com' });
        });

        it('should handle SCRIPT submission type', async () => {
            const mockRequest = {
                instance_name: 'test-db',
                db_type: 'MONGODB',
                pod_name: 'POD_1',
                submission_type: 'SCRIPT',
                query_content: null
            };
            const mockRequester = { name: 'Test User', email: 'test@example.com' };

            await expect(
                slackService.notifyNewSubmission(mockRequest, mockRequester, null)
            ).resolves.not.toThrow();
        });
    });

    describe('notifyApprovalResult', () => {
        it('should notify on successful execution', async () => {
            mockLookupByEmail.mockResolvedValue({ user: { id: 'U789' } });
            mockPostMessage.mockResolvedValue({ ok: true });

            const mockRequest = {
                id: 1,
                instance_name: 'test-db',
                db_type: 'POSTGRESQL'
            };
            const mockApprover = { name: 'Manager', email: 'manager@example.com' };
            const executionResult = { success: true, result: [{ id: 1 }] };

            await slackService.notifyApprovalResult(mockRequest, mockApprover, executionResult, 'requester@example.com');
            expect(mockLookupByEmail).toHaveBeenCalled();
        });

        it('should handle failed execution result', async () => {
            mockLookupByEmail.mockResolvedValue({ user: { id: 'U789' } });
            mockPostMessage.mockResolvedValue({ ok: true });

            const mockRequest = {
                id: 1,
                instance_name: 'test-db',
                db_type: 'POSTGRESQL'
            };
            const mockApprover = { name: 'Manager', email: 'manager@example.com' };
            const executionResult = { success: false, error: 'Connection failed' };

            await slackService.notifyApprovalResult(mockRequest, mockApprover, executionResult, 'requester@example.com');
            expect(mockPostMessage).toHaveBeenCalled();
        });

        it('should handle long result preview', async () => {
            mockLookupByEmail.mockResolvedValue({ user: { id: 'U789' } });
            mockPostMessage.mockResolvedValue({ ok: true });

            const mockRequest = { id: 1, instance_name: 'test-db', db_type: 'POSTGRESQL' };
            const mockApprover = { name: 'Manager', email: 'manager@example.com' };
            // Create a result with more than 500 characters
            const longResult = Array(100).fill({ id: 1, name: 'Test data' });
            const executionResult = { success: true, result: longResult };

            await slackService.notifyApprovalResult(mockRequest, mockApprover, executionResult, 'requester@example.com');
            expect(mockPostMessage).toHaveBeenCalled();
        });
    });

    describe('notifyRejection', () => {
        it('should notify requester on rejection', async () => {
            mockLookupByEmail.mockResolvedValue({ user: { id: 'U999' } });
            mockPostMessage.mockResolvedValue({ ok: true });

            const mockRequest = {
                instance_name: 'test-db',
                db_type: 'POSTGRESQL'
            };
            const mockApprover = { name: 'Manager' };

            await slackService.notifyRejection(mockRequest, mockApprover, 'requester@example.com', 'Invalid query');
            expect(mockLookupByEmail).toHaveBeenCalledWith({ email: 'requester@example.com' });
            expect(mockPostMessage).toHaveBeenCalled();
        });

        it('should handle rejection without requester email', async () => {
            const mockRequest = {
                instance_name: 'test-db',
                db_type: 'POSTGRESQL'
            };
            const mockApprover = { name: 'Manager' };

            await slackService.notifyRejection(mockRequest, mockApprover, null, 'No reason');
            expect(mockLookupByEmail).not.toHaveBeenCalled();
        });

        it('should handle rejection without reason', async () => {
            mockLookupByEmail.mockResolvedValue({ user: { id: 'U999' } });
            mockPostMessage.mockResolvedValue({ ok: true });

            const mockRequest = { instance_name: 'test-db', db_type: 'POSTGRESQL' };
            const mockApprover = { name: 'Manager' };

            await slackService.notifyRejection(mockRequest, mockApprover, 'requester@example.com', null);
            expect(mockPostMessage).toHaveBeenCalled();
        });
    });
});
