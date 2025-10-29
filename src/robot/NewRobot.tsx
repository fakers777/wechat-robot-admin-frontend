import { useRequest } from 'ahooks';
import { App, Form, Input, Modal, Switch, Collapse } from 'antd';
import React from 'react';
import type { Api } from '@/api/wechat-robot/wechat-robot';

interface IProps {
	open: boolean;
	onSuccess: () => void;
	onClose: () => void;
	onRefresh: () => void;
}

const NewRobot = (props: IProps) => {
	const { message } = App.useApp();

	const { open, onClose } = props;

	const [form] = Form.useForm<Api.V1RobotCreateCreate.RequestBody>();

	const { runAsync: onCreate, loading: createLoading } = useRequest(
		async (data: Api.V1RobotCreateCreate.RequestBody) => {
			const resp = await window.wechatRobotClient.api.v1RobotCreateCreate(data);
			props.onSuccess();
			await new Promise(resolve => setTimeout(resolve, 20000)); // 等待20秒钟
			return resp.data;
		},
		{
			manual: true,
			onSuccess: () => {
				message.success('创建成功');
			},
			onError: reason => {
				message.error(reason.message);
			},
		},
	);

	const onOk = async () => {
		const values = await form.validateFields();
		await onCreate(values);
		props.onRefresh?.();
		props.onClose();
	};

	return (
		<Modal
			title="创建机器人"
			open={open}
			okText="创建"
			onOk={onOk}
			confirmLoading={createLoading}
			onCancel={onClose}
			width={600}
		>
			<Form
				form={form}
				labelCol={{ flex: '0 0 95px' }}
				wrapperCol={{ flex: '1 1 auto' }}
				autoComplete="off"
			>
				<Form.Item
					name="robot_code"
					label="机器人编码"
					rules={[
						{ required: true, message: '机器人编码不能为空' },
						{ min: 5, message: '机器人编码至少输入5个字符' },
						{ max: 64, message: '机器人编码不能超过64个字符' },
						{ pattern: /^[a-zA-Z][a-zA-Z0-9_]+$/, message: '机器人编码必须以字母开头，且只能是字母、数字或下划线' },
					]}
				>
					<Input
						placeholder="请输入机器人编码"
						allowClear
					/>
				</Form.Item>

				<Collapse
					items={[
						{
							key: 'proxy',
							label: '代理设置（可选）',
							children: (
								<>
									<Form.Item
										name="proxy_enabled"
										label="启用代理"
										valuePropName="checked"
									>
										<Switch />
									</Form.Item>

									<Form.Item
										name="proxy_ip"
										label="代理地址"
										rules={[
											{
												validator: (_, value) => {
													const proxyEnabled = form.getFieldValue('proxy_enabled');
													if (proxyEnabled && value) {
														const re = /^[^:]+:\d+$/;
														if (!re.test(value)) {
															return Promise.reject(new Error('代理地址格式错误，应为 IP:端口 格式'));
														}
													}
													return Promise.resolve();
												},
											},
										]}
									>
										<Input
											placeholder="例如: 127.0.0.1:8080"
											allowClear
										/>
									</Form.Item>

									<Form.Item
										name="proxy_user"
										label="代理用户名"
									>
										<Input
											placeholder="代理用户名（可选）"
											allowClear
										/>
									</Form.Item>

									<Form.Item
										name="proxy_password"
										label="代理密码"
									>
										<Input.Password
											placeholder="代理密码（可选）"
											allowClear
										/>
									</Form.Item>
								</>
							),
						},
					]}
				/>
			</Form>
		</Modal>
	);
};

export default React.memo(NewRobot);
