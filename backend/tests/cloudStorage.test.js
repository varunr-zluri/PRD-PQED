const { uploadString } = require('../src/utils/cloudStorage');
const cloudinary = require('cloudinary').v2;

jest.mock('cloudinary', () => ({
    v2: {
        config: jest.fn(),
        uploader: {
            upload_stream: jest.fn()
        }
    }
}));

describe('Cloud Storage Utility', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should upload string content via stream', async () => {
        const mockStream = {
            write: jest.fn(),
            end: jest.fn(),
            on: jest.fn(),
            once: jest.fn(),
            emit: jest.fn(),
            pipe: jest.fn()
        };

        const mockUploadStream = jest.fn().mockImplementation((options, callback) => {
            callback(null, { secure_url: 'https://cloudinary/test-url' });
            return mockStream;
        });

        cloudinary.uploader.upload_stream.mockImplementation(mockUploadStream);

        const result = await uploadString('Hello, World!', 'test-file');

        expect(result).toBe('https://cloudinary/test-url');
        expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
            expect.objectContaining({
                resource_type: 'raw',
                public_id: 'test-file',
                folder: 'zluri-sre/results'
            }),
            expect.any(Function)
        );
    });

    it('should reject on upload error', async () => {
        const mockUploadStream = jest.fn().mockImplementation((options, callback) => {
            callback(new Error('Upload failed'), null);
            return {};
        });

        cloudinary.uploader.upload_stream.mockImplementation(mockUploadStream);

        await expect(uploadString('fail', 'fail-file')).rejects.toThrow('Upload failed');
    });
});
