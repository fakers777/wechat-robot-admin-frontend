import { useRequest } from 'ahooks';
import { App, Button, Form, Input, Switch, Card, Space } from 'antd';
import React, { useEffect } from 'react';
import type { Api } from '@/api/wechat-robot/wechat-robot';

interface IProps {
	robotId: number;
	robot: any;
	onRefresh: () => void;
}

const RobotProxySettings = (props: IProps) => {
	const { message: messageApi } = App.useApp();
	const [form] = Form.useForm<Api.V1RobotUpdateCreate.RequestBody>();

	const { runAsync: onUpdate, loading: updateLoading } = useRequest(
		async (data: Api.V1RobotUpdateCreate.RequestBody) => {
			console.log('调用API更新代理设置:', data);
			
			// 检查 API 客户端是否已初始化
			if (!window.wechatRobotClient || !window.wechatRobotClient.api) {
				console.error('API客户端未正确初始化');
				throw new Error('API客户端未正确初始化，请刷新页面重试');
			}
			
		const resp = await window.wechatRobotClient.api.v1RobotUpdateCreate(data);
			console.log('API响应:', resp);
			props.onRefresh();
			return resp.data;
		},
		{
			manual: true,
			onSuccess: () => {
				messageApi.success('代理设置更新成功');
			},
			onError: reason => {
				console.error('更新代理设置失败:', reason);
				messageApi.error(reason.message || '更新失败');
			},
		},
	);

	// 初始化表单数据
	useEffect(() => {
		if (props.robot) {
			form.setFieldsValue({
				id: props.robot.id,
				proxy_enabled: props.robot.proxy_enabled || false,
				proxy_ip: props.robot.proxy_ip || '',
				proxy_user: props.robot.proxy_user || '',
				proxy_password: props.robot.proxy_password || '',
			});
		}
	}, [props.robot, form]);

	const onFinish = async (values: Api.V1RobotUpdateCreate.RequestBody) => {
		console.log('提交的代理设置数据:', values);
		await onUpdate(values);
	};

	return (
		<div style={{ padding: 24 }}>
			<Card title="代理设置" style={{ maxWidth: 600 }}>
				<Form
					form={form}
					layout="vertical"
					onFinish={onFinish}
					autoComplete="off"
				>
					{/* 隐藏的ID字段 */}
					<Form.Item name="id" hidden>
						<Input type="hidden" />
					</Form.Item>

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

					<Form.Item>
						<Space>
							<Button
								type="primary"
								htmlType="submit"
								loading={updateLoading}
							>
								保存设置
							</Button>
							<Button
								onClick={() => {
									form.resetFields();
									// 重新设置初始值
									if (props.robot) {
										form.setFieldsValue({
											id: props.robot.id,
											proxy_enabled: props.robot.proxy_enabled || false,
											proxy_ip: props.robot.proxy_ip || '',
											proxy_user: props.robot.proxy_user || '',
											proxy_password: props.robot.proxy_password || '',
										});
									}
								}}
							>
								重置
							</Button>
						</Space>
					</Form.Item>
				</Form>
			</Card>
		</div>
	);
};

export default React.memo(RobotProxySettings);
