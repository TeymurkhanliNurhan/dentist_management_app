import { useState, useEffect } from 'react';
import { Mail, FileImage, X, Send, Upload, Phone } from 'lucide-react';
import Header from './Header';

const Contact = () => {
  const [contactInfo, setContactInfo] = useState<{ email: string; phone: string } | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);
  const [formData, setFormData] = useState({
    header: '',
    context: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/contact/info', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setContactInfo(data);
        }
      } catch (err) {
        console.error('Failed to fetch contact info:', err);
      } finally {
        setIsLoadingInfo(false);
      }
    };

    fetchContactInfo();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter((file) => {
        return file.type.startsWith('image/');
      });
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    if (!formData.header.trim() || !formData.context.trim()) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('header', formData.header);
      formDataToSend.append('context', formData.context);
      
      files.forEach((file) => {
        formDataToSend.append('files', file);
      });

      const response = await fetch('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      const data = await response.json();
      setSuccess(data.message || 'Your message has been sent successfully!');
      setFormData({ header: '', context: '' });
      setFiles([]);
    } catch (err: any) {
      console.error('Contact form error:', err);
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Contact Us</h1>
            
            {!isLoadingInfo && contactInfo && (
              <div className="mb-8 p-6 bg-teal-50 border border-teal-200 rounded-lg">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-teal-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone Number</p>
                      <p className="text-lg text-gray-900">{contactInfo.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-teal-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email Address</p>
                      <p className="text-lg text-gray-900">{contactInfo.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-8 border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Send Us a Message</h2>
              <p className="text-gray-700 text-sm">
                Send us a message with any questions, feedback, or concerns. You can attach images to your message.
              </p>
            </div>
          </div>

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="header" className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="header"
                  name="header"
                  value={formData.header}
                  onChange={handleChange}
                  required
                  maxLength={200}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                  placeholder="Enter subject"
                />
              </div>
            </div>

            <div>
              <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="context"
                name="context"
                value={formData.context}
                onChange={handleChange}
                required
                rows={8}
                maxLength={2000}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all resize-none"
                placeholder="Enter your message here..."
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.context.length}/2000 characters
              </p>
            </div>

            <div>
              <label htmlFor="files" className="block text-sm font-medium text-gray-700 mb-2">
                Attach Images (Optional)
              </label>
              <div className="flex items-center space-x-4">
                <label
                  htmlFor="file-input"
                  className="flex items-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors cursor-pointer"
                >
                  <Upload className="w-5 h-5" />
                  <span>Choose Images</span>
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="text-sm text-gray-600">
                  {files.length} file(s) selected
                </span>
              </div>

              {files.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {files.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="mt-1 text-xs text-gray-600 truncate">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-6 py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
                <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Contact;

